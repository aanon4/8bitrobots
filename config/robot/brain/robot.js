'use strict';

console.info('Loading Robot Brain.');

const MotionPlanner = require('services/motion-planner');
const StateManager = require('services/state-manager');

const TOPIC_STATE = { topic: 'state', latching: true };

function controller(robot)
{
  this.robot = robot;
  this._states = {};
  this._transition = null;
  this._pending = null;
  this._pendingTick = false;
  this._store = new StateManager(
  {
    name: 'robot'
  });

  var files = require('fs').readdirSync(`${__dirname}/gestures`);
  files.sort();
  files.forEach((file) =>
  {
    if (/.*\.js$/.test(file))
    {
      this.load(require(`./gestures/${file}`));
    }
  });
}

controller.prototype =
{
  enable: function()
  {
    this._adState = this.robot._node.advertise(TOPIC_STATE);
    this._adState.publish({ state: this.getState() });

    setInterval(() =>
    {
      this.tick();
    }, 100);

    return this;
  },

  disable: function()
  {
    this.robot._node.unadvertise(TOPIC_STATE);
    return this;
  },

  gesture: function(destination)
  {
    if (this._transition)
    {
      this._pending = destination;
    }
    else
    {
      this._gesture(destination);
    }
  },

  tick: function()
  {
    if (!this._pending && !this._pendingTick)
    {
      if (this._transition)
      {
        this._pendingTick = true;
        this._transition.then(() =>
        {
          this._pendingTick = false;
          this.tick();
        });
      }
      else
      {
        this._gesture(this.getState());
      }
    }
  },

  getState: function()
  {
    return this._store.get('state', 'Idle');
  },

  setState: function(state)
  {
    this._store.set('state', state);
  },

  isState: function(maybe)
  {
    return this.getState() == maybe;
  },

  _gesture: function(destination)
  {
    if (this._transition)
    {
      throw new Error();
    }
    let target = this.find(this.getState(), destination);
    if (target)
    {
      this._transition = new Promise((resolve) =>
      {
        if (this.getState() != target)
        {
          //console.log(this.getState(), '->', target);
          let old = this.getState();
          this.setState(`${old}:${target}`);
          this._adState.publish({ state: this.getState() });
          resolve(Promise.resolve(this._states[old][target]()).then(() =>
          {
            this.setState(target);
            this._adState.publish({ state: this.getState() });
          }));
        }
        else
        {
          resolve();
        }
      }).then(() =>
      {
        return Promise.resolve(this._states[this.getState()][this.getState()]());
      }).then(() =>
      {
        this._transition = null;
        if (this.getState() != destination)
        {
          this._gesture(destination);
        }
        else if (this._pending)
        {
          destination = this._pending;
          this._pending = null;
          this._gesture(destination);
        }
      }).catch((e) =>
      {
        this._transition = null;
        this._pending = null;
        console.error(e.stack);
      });
    }
  },

  runSeq: function(seq)
  {
    return new Promise((resolve) =>
    {
      let p = this.robot;
      let i = 0;
      let enabled = {};

      let enable = (name) =>
      {
        if (!(name in enabled))
        {
          enabled[name] = true;
          p.servoIdle(name, false);
        }
      }
  
      let step = () =>
      {
        while (i < seq.length)
        {
          let next = seq[i];
          i++;
          switch (next[0])
          {
            case 'S': // Move servo
              enable(next[1]);
              let func;
              switch (next[4])
              {
                case 'L':
                  func = MotionPlanner.LINEAR;
                  break;
                case 'I':
                  func = MotionPlanner.EASE_IN;
                  break;
                case 'O':
                  func = MotionPlanner.EAST_OUT;
                  break;
                case 'E':
                default:
                  func = MotionPlanner.EASE_INOUT;
                  break;
              }
              p.servoActual(next[1], Math.PI / 2 + next[2], next[3] * 1000, func);
              break;
            case 'W': // Wait for servos
              let sync = [];
              for (let j = 1; j < next.length; j++)
              {
                let s = next[j];
                sync.push(p.servoActualWait(s[0], s[1], Math.PI / 2 + s[2]));
              }
              if (sync.length)
              {
                Promise.all(sync).then(step);
                return;
              }
              break;
            case 'M': // Turn motor
              p.motorActual(next[1], next[2], next[3]);
              break;
            case 'I': // Wait for everything to be idle
              Promise.all(Object.keys(enabled).map((servo) =>
              {
                return p.servoActualWait(servo, 'idle', 0);
              })).then(step);
              return;                     
            case 'E': // Keep enabled
              enable(next[1]);
              enabled[next[1]] = false;
              break;
            case 'Z': // Sleep
              setTimeout(step, next[1] * 1000);
              return;
            default:
              break;
          }
        }
        Promise.all(Object.keys(enabled).map((servo) =>
        {
          if (enabled[servo])
          {
            p.servoIdle(servo, true);
            return p.servoActualWait(servo, 'idle', 0);
          }
          else
          {
            return false;
          }
        })).then(() =>
        {
          resolve(true);
        });
      };
      step();
    });
  },

  load: function(gesture)
  {
    function empty() {}
    gesture.init(this);
    for (var state in gesture)
    {
      let fn = gesture[state];
      let fromto = state.split(':');
      if (fromto[0] && fromto[1])
      {
        let row = this._states[fromto[0]] || (this._states[fromto[0]] = {});
        let current = row[fromto[1]];
        if (fromto[0] == fromto[1])
        {
          if (current)
          {
            throw new Error('Cannot override state');
          }
          row[fromto[1]] = fn || empty;
        }
        else
        {
          if (current && fn)
          {
            // Transition - make sure we exit before we enter
            if (gesture[`${fromto[1]}:${fromto[1]}`])
            {
              // Entering
              row[fromto[1]] = function()
              {
                return Promise.resolve(current).then(() =>
                {
                  return fn();
                });
              }
            }
            else
            {
              // Exiting
              return Promise.resolve(fn).then(() =>
              {
                return current();
              });
            }
          }
          else
          {
            row[fromto[1]] = fn || empty;
          }
        }
      }
    }
  },

  find: function(current, event)
  {
    let next = this._findNext(current, event, {});
    if (next.depth >= 99999)
    {
      return null;
    }
    return next.event;
  },

  _findNext: function(current, event, visited)
  {
    if (current in visited)
    {
      return { event: event, depth: 99999 };
    }
    visited[current] = true;
    var gesture = this._states[current][event];
    if (gesture)
    {
      return { event: event, depth: 1 };
    }
    else
    {
      return Object.keys(this._states[current]).map((option) =>
      {
        return { event: option, depth: 1 + this._findNext(option, event, Object.assign({}, visited)).depth };
      }).reduce((selected, current) =>
      {
        return selected.depth < current.depth ? selected : current;
      });
    }
  }
}

module.exports = controller;
