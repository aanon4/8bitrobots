'use strict';

const native = require('.');
const MotionPlanner = require('services/motion-planner');

console.info('Loading RaspberryPi PCA9685 controllers.');

function pwmChannel(pwm, subaddress)
{
  this._pwm = pwm;
  this._subaddress = subaddress;
  this._enabled = false;
  this._planner = new MotionPlanner();
  this._plans = [];
  this._lastMs = null;
}

pwmChannel.prototype =
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
        cycle: this._pwm._cycleMs,
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
              native.pca9685_disable(this._pwm._handle, this._subaddress);
            }
            else
            {
              native.pca9685_enable(this._pwm._handle, this._subaddress);
            }
            run();
          }
          else
          {
            native.pca9685_setPlan(this._pwm._handle, this._subaddress, this._plans[0].movement, run);
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
    return this._plans.length > 0 && this._plans[0].movement ? this._plans[0].movement[native.pca9685_getCurrentIndex(this._pwm.handle, this._subaddress)] : this._lastMs;
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
      this._pwm._enabled++;
      if (this._pwm._enabled === 1)
      {
        native.pca9685_start(this._pwm._handle);
      }
      native.pca9685_enable(this._pwm._handle, this._subaddress);
    }
    return this;
  },

  disable: function()
  {
    if (this._enabled)
    {
      this._enabled = false;
      this._pwm._enabled--;
      native.pca9685_disable(this._pwm._handle, this._subaddress);
      if (this._pwm._enabled === 0)
      {
        native.pca9685_stop(this._pwm._handle);
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
    this._pwm._setCyclePeriod(cycleMs);
  },
  
  getCyclePeriod: function()
  {
    return this._pwm._cycleMs;
  },

  isPulseChanging: function()
  {
    return this._plans.length > 0;
  }
};

function PWM(config)
{
  this._i2c = config.i2c;
  this._channels =
  [
    new pwmChannel(this, 0),
    new pwmChannel(this, 1),
    new pwmChannel(this, 2),
    new pwmChannel(this, 3),
    new pwmChannel(this, 4),
    new pwmChannel(this, 5),
    new pwmChannel(this, 6),
    new pwmChannel(this, 7),
    new pwmChannel(this, 8),
    new pwmChannel(this, 9),
    new pwmChannel(this, 10),
    new pwmChannel(this, 11),
    new pwmChannel(this, 12),
    new pwmChannel(this, 13),
    new pwmChannel(this, 14),
    new pwmChannel(this, 15)
  ];
  this._enabled = 0;
  this._handle = native.pca9685_create(this._i2c.address());
  if (this._handle < 0)
  {
    throw new Error("Failed to create PWM. Error = " + this._handle);
  }
}

PWM.prototype =
{
  _setCyclePeriod: function(cycleMs)
  {
    if (this._cycleMs === undefined)
    {
      this._cycleMs = cycleMs;
      native.pca9685_setCyclePeriod(this._handle, this._cycleMs);
    }
    else if (this._cycleMs !== cycleMs)
    {
      throw new Error('Cannot change cycle period once set: old ' + this._cycleMs + ' new ' + cycleMs);
    }
  },

  getChannel: function(config)
  {
    if (config.channel >= 0 && config.channel < this._channels.length)
    {
      return this._channels[config.channel];
    }
    throw new Error('Bad Servo channel');
  }
};

var pwmCache = {};

function pwmProxy(config)
{
  this._pwm = pwmCache[config.i2c.id()];
  if (!this._pwm)
  {
    this._pwm = pwmCache[config.i2c.id()] = new PWM(config);
  }
}

pwmProxy.prototype =
{
  getChannel: function(config)
  {
    return this._pwm.getChannel(config);
  }
};

module.exports = pwmProxy;
