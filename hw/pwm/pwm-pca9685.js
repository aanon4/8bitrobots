'use strict';

console.info('Loading PCA9685 controllers.');

const MotionPlanner = require('modules/motion-planner');


function pwmChannel(pwm, subaddress)
{
  this._pwm = pwm;
  this._subaddress = subaddress;
  this._enabled = false;
  this._planner = new MotionPlanner();
  this._plans = [];
  this._currentMs = null;
  this._lastMs = null;
}

pwmChannel.prototype =
{
  enable: function()
  {
    this._enabled = true;
    return this;
  },

  disable: function()
  {
    this._enabled = false;
    if (this._plans.length === 0)
    {
      this._pwm._setPulseMs(this._subaddress, 0);
    }
    return this;
  },

  setPulse: function(onMs, periodMs, func)
  {
    this.setPlan(
    [
      {
        end: onMs,
        func: func,
        time: periodMs || 0
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
    return this._currentMs;
  },

  getTargetPulse: function()
  {
    return this._lastMs;
  },

  idle: function()
  {
    if (this._currentMs !== 0)
    {
      this._enqueue({ idle: true });
    }
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
  },

  _enqueue: function(plan)
  {
    this._plans.push(plan);
    if (this._plans.length === 1)
    {
      const run = () => {
        if (!this._enabled)
        {
          this._pwm._setPulseMs(this._subaddress, 0);
        }
        else if (this._plans.length > 0)
        {
          const plan = this._plans[0];
          if ('idle' in plan)
          {
            if (plan.idle)
            {
              this._currentMs = 0;
              this._pwm._setPulseMs(this._subaddress, 0);
            }
            this._plans.shift();
            run();
          }
          else if ('movement' in plan)
          {
            this._planner.execute(plan.movement, this.getCyclePeriod(),
              (value) => {
                this._currentMs = value;
                this._pwm._setPulseMs(this._subaddress, this._currentMs);
              },
              () => {
                this._plans.shift();
                run();
              }
            );
          }
        }
      }
      run();
    }
  }
};

function PWM(config)
{
  this._i2c = config.i2c;
  this._prescaleTweak = config.prescaleTweak || 0;
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
}

PWM.prototype =
{
  _setCyclePeriod: function(cycleMs)
  {
    if (this._cycleMs === undefined)
    {
      this._cycleMs = cycleMs;
      this._tick = this._cycleMs / (4096 - 1);
      const prescale = (Math.round((25 * 1000 * 1000 * cycleMs) / (4096 * 1000)) - 1 + this._prescaleTweak) & 0xFF;                  
      this._i2c.writeBytes(Buffer.from([ 0x00, 0x20 | 0x10 ]));
      this._i2c.writeBytes(Buffer.from([ 0x01, 0x04 ]));
      this._i2c.writeBytes(Buffer.from([ 0xFE, prescale ]));
      this._i2c.writeBytes(Buffer.from([ 0x00, 0x20 ]));
    }
    else if (this._cycleMs !== cycleMs)
    {
      throw new Error('Cannot change cycle period once set: old ' + this._cycleMs + ' new ' + cycleMs);
    }
  },

  _setPulseMs: function(subaddress, pulseMs)
  {
    const v = pulseMs / this._tick;
    this._i2c.writeBytes(Buffer.from([ 6 + 4 * subaddress, 0, 0, v & 0xFF, (v >> 8) & 0xFF ]));
  },

  open: function(config)
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
  open: function(config)
  {
    return this._pwm.open(config);
  }
};

module.exports = pwmProxy;
