'use strict';

const native = require('.');
const MotionPlanner = require('services/motion-planner');

console.info('Loading BeagleBoneBlue Servo controllers.');

function servoChannel(servos, config)
{
  this._servos = servos;
  this._subaddress = config.channel;
  this._enabled = false;
  this._planner = new MotionPlanner();
  this._plans = [];
  this._lastMs = null;
}

servoChannel.prototype =
{
  setPulse: function(onMs, periodMs, func)
  {
    this.setPlan(
    [
      {
        end: onMs,
        func: func,
        time: periodMs
      }
    ]);
  },

  setPlan: function(steps)
  {
    if (this._enabled)
    {
      if (this._lastMs === null)
      {
        this._lastMs = steps[0].end;
        steps[0].time = 0;
      }
      let plan = this._planner.generate(
      {
        start: this._lastMs,
        cycle: this._servos._cycleMs,
        steps: steps
      });
      this._lastMs = steps[steps.length - 1].end;
      this._enqueue({ movement: plan });
    }
  },

  _enqueue: function(plan)
  {
    this._plans.push(plan);
    if (this._plans.length === 1)
    {
      this._plans.unshift({}); // Fake to pop
      const run = () =>
      {
        this._plans.shift();
        if (this._plans.length > 0)
        {
          if ('idle' in this._plans[0])
          {
            if (this._plans[0].idle)
            {
              native.bbb_servos2_disable(this._servos._handle, this._subaddress);
            }
            else
            {
              native.bbb_servos2_enable(this._servos._handle, this._subaddress);
            }
            run();
          }
          else
          {
            native.bbb_servos2_setPlan(this._servos._handle, this._subaddress, this._plans[0].movement, run);
          }
        }
      }
      run();
    }
  },

  setDutyCycle: function(fraction)
  {
    if (fraction < 0)
    {
      fraction = 0;
    }
    else if (fraction > 1)
    {
      fraction = 1;
    }
    this.setPulse(fraction * this.getCyclePeriod());
  },
  
  getCurrentPulse: function()
  {
    return this._plans.length > 0 && this._plans[0].movement ? this._plans[0].movement[native.bbb_servos2_getCurrentIndex(this._servos.handle, this._subaddress)] : this._lastMs;
  },

  getTargetPulse: function()
  {
    return this._lastMs;
  },

  enable: function()
  {
    if (!this._enabled)
    {
      this._enabled = true;
      this._servos._enabled++;
      if (this._servos._enabled === 1)
      {
        native.bbb_servos2_start(this._servos._handle);
      }
      native.bbb_servos2_enable(this._servos._handle, this._subaddress);
    }
    return this;
  },

  disable: function()
  {
    if (this._enabled)
    {
      this._enabled = false;
      this._servos._enabled--;
      native.bbb_servos2_disable(this._servos._handle, this._subaddress);
      if (this._servos._enabled === 0)
      {
        native.bbb_servos2_stop(this._servos._handle);
      }
    }
    return this;
  },

  idle: function(idle)
  {
    this._enqueue({ idle: idle });
  },

  setCyclePeriod: function(cycleMs)
  {
    this._servos._setCyclePeriod(cycleMs);
  },
  
  getCyclePeriod: function()
  {
    return this._servos._cycleMs;
  },

  isChanging: function()
  {
    return this._plans.length > 0;
  }
};

function Servos()
{
  this._channels = [ null, null, null, null, null, null, null, null ];
  this._enabled = 0;
  this._handle = native.bbb_servos2_create();
  if (this._handle < 0)
  {
    throw new Error("Failed to create Servos. Error = " + this._handle);
  }
}

Servos.prototype =
{
  _setCyclePeriod: function(cycleMs)
  {
    if (this._cycleMs === undefined)
    {
      this._cycleMs = cycleMs;
      native.bbb_servos2_setCyclePeriod(this._handle, this._cycleMs);
    }
    else if (this._cycleMs !== cycleMs)
    {
      throw new Error('Cannot change cycle period once set: old ' + this._cycleMs + ' new ' + cycleMs);
    }
  },

  getChannel: function(config)
  {
    if (config.channel < 0 || config.channel >= this._channels.length)
    {
      throw new Error('Bad Servo channel');
    }
    let servo = this._channels[config.channel];
    if (!servo)
    {
      servo = new servoChannel(this, config);
    }
    return servo;
  }
};

const _servos = new Servos();

function servosProxy()
{
}

servosProxy.prototype =
{
  getChannel: function(config)
  {
    return _servos.getChannel(config);
  }
};

module.exports = servosProxy;
