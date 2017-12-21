'use strict';

const native = require('.');
const MotionPlanner = require('services/motion-planner');

console.info('Loading BeagleBoneBlue Motors controllers.');

function motorChannel(motors, config)
{
  this._motors = motors;
  this._motor = config.motor;
  this._subaddress = config.channel;
  this._enabled = false;
  this._planner = new MotionPlanner();
  this._busy = false;
  this._plans = [];
  this._lastValue = null;
  this._kV = 0;
}

motorChannel.prototype =
{
  setRPM: function(rpm, changeMs, func)
  {
    const maxRPM = this._maxRPM();
    let duty;
    if (rpm === 0 || maxRPM === 0)
    {
      duty = 0;
    }
    else if (rpm > 0)
    {
      duty = Math.min(1.0, rpm / maxRPM);
    }
    else
    {
      duty = Math.max(-1.0, rpm / maxRPM);
    }
    this.setPlan(
    [
      {
        end: duty,
        func: func,
        time: changeMs
      }
    ]);
  },

  getCurrentRPM: function()
  {
    return this._maxRPM() * (this._busy ? this._plans[0][native.bbb_motors2_getCurrentIndex(this._motors._handle, this._subaddress)] : this._lastValue);
  },

  _maxRPM: function()
  {
    return native.bbb_power_battery() * this._kV;
  },

  setVelocity: function(velocity, periodMs, func)
  {
    this.setPlan(
    [
      {
        end: velocity,
        func: func,
        time: periodMs
      }
    ]);
  },

  setPlan: function(steps)
  {
    if (this._enabled)
    {
      if (this._lastValue === null)
      {
        this._lastValue = steps[0].end;
        steps[0].time = 0;
      }
      let plan = this._planner.generate(
      {
        start: this._lastValue,
        cycle: this._motors._cycleMs,
        steps: steps
      });
      this._lastValue = steps[steps.length - 1].end;
      this._plans.push(plan);
      if (this._plans.length === 1)
      {
        this._busy = true;
        const run = () =>
        {
          native.bbb_motors2_setPlan(this._motors._handle, this._subaddress, this._plans[0], () =>
          {
            this._plans.shift();
            if (this._plans.length === 0)
            {
              this._busy = false;
            }
            else
            {
              run();
            }
          });
        }
        run();
      }
    }
  },
  
  getCurrentVelocity: function()
  {
    return this._busy ? this._plans[0][native.bbb_motors2_getCurrentIndex(this._motors._handle, this._subaddress)] : this._lastValue;
  },

  getTargetVelocity: function()
  {
    return this._lastValue;
  },

  enable: function()
  {
    if (!this._enabled)
    {
      this._enabled = true;
      this._busy = false;
      this._motors._enabled++;
      if (this._motors._enabled === 1)
      {
        native.bbb_motors2_start(this._motors._handle);
      }
      native.bbb_motors2_enable(this._motors._handle, this._subaddress);
    }
    return this;
  },

  disable: function()
  {
    if (this._enabled)
    {
      this._enabled = false;
      this._busy = false;
      this._motors._enabled--;
      native.bbb_motors2_disable(this._motors._handle, this._subaddress);
      if (this._motors._enabled === 0)
      {
        native.bbb_motors2_stop(this._motors._handle);
      }
    }
    return this;
  },

  idle: function(idle)
  {
    if (idle)
    {
      native.bbb_motors2_disable(this._motors._handle, this._subaddress);
    }
    else
    {
      native.bbb_motors2_enable(this._motors._handle, this._subaddress);
    }
  },

  setKV: function(kV)
  {
    this._kV = kV;
  },

  setCyclePeriod: function(cycleMs)
  {
    this._motors._setCyclePeriod(cycleMs);
  },
  
  getCyclePeriod: function()
  {
    return this._motors._cycleMs;
  },

  isChanging: function()
  {
    return this._busy;
  }
};

function motors()
{
  this._channels = [ null, null, null, null ];
  this._enabled = 0;
  this._handle = native.bbb_motors2_create();
  if (this._handle < 0)
  {
    throw new Error("Failed to create motors. Error = " + this._handle);
  }
}

motors.prototype =
{
  _setCyclePeriod: function(cycleMs)
  {
    if (this._cycleMs === undefined)
    {
      this._cycleMs = cycleMs;
      native.bbb_motors2_setCyclePeriod(this._handle, this._cycleMs);
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
      throw new Error('Bad motor channel');
    }
    let motor = _motors._channels[config.channel];
    if (!motor)
    {
      motor = new motorChannel(this, config);
    }
    return motor;
  }
};

const _motors = new motors();

function motorsProxy()
{
}

motorsProxy.prototype =
{
  getChannel: function(config)
  {
    return _motors.getChannel(config);
  }
};

module.exports = motorsProxy;
