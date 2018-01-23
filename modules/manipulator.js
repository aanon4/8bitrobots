console.info('Loading Manipulators.');

const THREE = require('./three');

const TOPIC_CONTROL = { topic: 'set_control' };

const ranges =
{
  'hand.open':       { low:  -10, high: 80, adjust:  -5, dir:  1  },
  'wrist.rotate':    { low:  -90, high: 90, adjust:   0, dir:  1  },
  'wrist.flex':      { low:  -90, high: 90, adjust: -70, dir: -1  },
  'elbow.flex':      { low:  -90, high: 90, adjust:  40, dir: -1  },
  'shoulder.rotate': { low:  -45, high: 20, adjust:   0, dir:  1  },
  'shoulder.flex':   { low:  -30, high: 85, adjust:   0, dir:  1  }
};

const deployPeriod = 2000;


function manipulator(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  this._servos = {};
  config.servos.forEach(function(servo)
  {
    this._servos[servo._name] = servo;
  }, this);
  this._enabled = false;
  this._status = 'stowed';
}

manipulator.prototype =
{
  enable: function()
  {
    this._node.subscribe(TOPIC_CONTROL, (event) =>
    {
      this._handleActionEvents(event);
    });
    for (var name in this._servos)
    {
      this._servos[name].enable();
    }
    this._enabled = true;

    return this;
  },
  
  disable: function()
  {
    this._enabled = false;
    for (var name in this._servos)
    {
      this._servos[name].disable();
    }
    this._node.unsubscribe(TOPIC_CONTROL);
  },

  stow: function(callback)
  {
    if (this._status === 'deployed')
    {
      this._status = 'stowing';
      this.execute(
      [
        { fn: this._moveToDeployPosition },
        { fn: this._moveToStowPosition },
        { wait: 'servos'},
        { enable: false },
        { fn: function()
          {
            this._status = 'stowed';
            callback && callback(true);
          }
        }
      ], deployPeriod);
    }
    else
    {
      callback && callback(false);
    }
  },

  deploy: function(callback)
  {
    if (this._status === 'stowed')
    {
      this._status = 'deploying';
      this.execute(
      [
        { enable: true },
        { fn: this._setStowPosition },
        { fn: this._moveToDeployPosition },
        { wait: 'servos' },
        { fn: function()
          {
            this._status = 'deployed';
            callback && callback(true);
          }
        }
      ], deployPeriod);
    }
    else
    {
      callback && callback(false);
    }
  },

  _moveToDeployPosition: function(callback)
  {
    /*
    this.execute(
    [
      { handPinch: 32 },
      { wait: 'servos' },
      { wristFlex: -70 },
      { elbowFlex: -120 },
      { shoulderFlex: 60 },
      { wristRotate: 0 },
      { wait: 'servos' },
      { shoulderRotate: 0 },
      { wait: 'servos' },
      { fn: callback }
    ], deployPeriod);
    */
    callback();
  },

  _moveToStowPosition: function(callback)
  {
    /*
    this.execute(
    [
      { handPinch: 32 },
      { shoulderRotate: 85 },
      { shoulderFlex: 60 },
      { wait: 'servos' },
      { wristFlex: -85 },
      { elbowFlex: -145 },
      { wait: 'servos' },
      { handPinch: 60 },
      { wait: 'servos' },
      { fn: callback }
    ], deployPeriod);
    */
    callback();
  },

  _setStowPosition: function(callback)
  {
    /*
    this.execute(
    [
      { shoulderRotate: 85 },
      { shoulderFlex: 60 },
      { wristFlex: -85 },
      { elbowFlex: -145 },
      { handPinch: 60 },
      { fn: callback }
    ], deployPeriod);
    */
    callback();
  },

  execute: function(cmds, period)
  {
    const self = this;
    var idx = 0;
    function next()
    {
      if (idx < cmds.length)
      {
        var cmd = cmds[idx++];
        for (var key in cmd)
        {
          switch (key)
          {
            case 'enable':
              self._enabled = !!cmd[key];
              for (var id in self._servos)
              {
                self._enabled ? self._servos[id].enable() : self._servos[id].disable();
              }
              next();
              break;

            case 'wait':
              switch (cmd[key])
              {
                case 'servos':
                  // Wait for the servos to stop moving. We have to poll them (no callbacks).
                  function waitServos()
                  {
                    var changing = false;
                    for (var id in self._servos)
                    {
                      changing |= self._servos[id].isChanging();
                    }
                    if (changing)
                    {
                      setTimeout(waitServos, 100);
                    }
                    else
                    {
                      next();
                    }
                  }
                  waitServos();
                  break;

                default:
                  if (typeof cmd[key] === 'number')
                  {
                    setTimeout(next, cmd[key] * 1000);
                  }
                  else
                  {
                    console.error('Unknown execute command: ' + JSON.stringify(cmd));
                    next();
                  }
                  break;
              }
              break;

            case 'fn':
              if (cmd[key])
              {
                cmd[key].call(self, next);
              }
              else
              {
                next();
              }
              break;

            default:
              if (self._servos[key])
              {
                self._manipulatorMove(key, cmd[key], period);
              }
              else
              {
                console.error('Unknown execute command: ' + JSON.stringify(cmd));
              }
              next();
              break;
          }
        }
      }
    }
    next();
  },

  _handleActionEvents: function(event)
  {
    switch (event.action)
    {
      case 'deploy':
        this.deploy();
        break;

      case 'stow':
        this.stow();
        break;
        
      case 'shoulder.rotate':
      //case 'shoulder.flex':
      case 'elbow.flex':
      case 'wrist.rotate':
      case 'wrist.flex':
        this._manipulatorMove(event.action, event.value * 90);
        break;
        
      case 'hand.open':
        //this._manipulatorMove(event.action, (event.value + 1) * 45);
        break;

      default:
        break;
    }
  },

  _manipulatorMove: function(servo, angle)
  {
    if (this._enabled)
    {
      try
      {
        angle = (angle + ranges[servo].adjust) * ranges[servo].dir;
        if (angle < ranges[servo].low)
        {
          angle = ranges[servo].low;
        }
        if (angle > ranges[servo].high)
        {
          angle = ranges[servo].high;
        }
        this._servos[servo].setAngle(90 + angle, 1);
      }
      catch (e)
      {
        console.log('Manipulator error: ' + servo + ' ' + e);
      }
    }
  }
};

module.exports = manipulator;
