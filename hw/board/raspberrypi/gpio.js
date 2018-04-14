'use strict';

console.info('Loading RaspberryPi GPIO/PWM controllers.');

const MotionPlanner = require('modules/motion-planner');

let PIGPIO;
if (!SIMULATOR)
{
  PIGPIO = require('pigpio');
}
else
{
  PIGPIO =
  {
    initialize: function() {},
    configureClock: function() {},
    Gpio: function() {}
  };
  PIGPIO.Gpio.prototype =
  {
    digitalRead: function() {},
    digitalWrite: function() {},
    mode: function() {},
    on: function() {},
    enableInterrupt: function() {}
  };
}

function gpioChannel(gpios, subaddress)
{
  this._gpios = gpios;
  this._subaddress = subaddress;
  this._enabled = 0;
  this._lastValue = null;
  this._lastDir = null;
  this._targetValue = null;
  this._callbacks = null;
  this._planner = new MotionPlanner();
  this._plans = [];
  this._lastMs = null;
}

gpioChannel.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._gpio = new PIGPIO.Gpio(this._subaddress, {});
    }
    return this;
  },

  disable: function()
  {
    --this._enabled;
    return this;
  },

  id: function()
  {
    return this._subaddress;
  },

  // -- GPIO

  set: function(value)
  {
    if (this._enabled && value !== this._lastValue)
    {
      if (this._lastDir != 'output')
      {
        this.dir('output');
      }
      this._gpio.digitalWrite(value ? 1 : 0);
      this._lastValue = value;
    }
  },

  get: function()
  {
    if (this._enabled)
    {
      if (this._lastDir != 'input')
      {
        this.dir('input');
      }
      return this._gpio.digitalRead();
    }
    else
    {
      return -1;
    }
  },

  dir: function(dir)
  {
    if (this._enabled && dir !== this._lastDir)
    {
      this._lastDir = dir;
      if (dir != 'output')
      {
        dir = PIGPIO.Gpio.INPUT;
      }
      else
      {
        dir = PIGPIO.Gpio.OUTPUT;
      }
      this._gpio.mode(dir);
    }
  },

  onEdge: function(edge, callback)
  {
    if (this._lastDir != 'input')
    {
      this.dir('input');
    }
    if (!this._callbacks)
    {
      this._callbacks = [];
      this._gpio.on('interrupt', (value) => {
        this._callbacks.forEach((fn) =>
        {
          fn(value);
        });
      });
      this._gpio.enableInterrupt(edge == 'rising' ? PIGPIO.Gpio.RISING_EDGE : edge == 'falling' ? PIGPIO.Gpio.FALLING_EDGE : PIGPIO.Gpio.EITHER_EDGE);
    }
    this._callbacks.push(callback);
  },

  // PWM ----

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
    if (this._targetValue === null)
    {
      this._targetValue = steps[0].end;
      steps[0].time = 0;
    }
    let plan = this._planner.generate(
    {
      start: this._targetValue,
      cycle: this.getCyclePeriod(),
      steps: steps
    });
    this._targetValue = steps[steps.length -1].end;
    this._plans.push(plan);
    if (this._plans.length === 1)
    {
      let timer = null;
      let idx = 0;
      const cyclePeriod = this.getCyclePeriod();
      const run = () => {
        const plan = this._plans[0];
        this._lastValue = plan[idx++];
        const pwmCycle = Math.round(255 * this._lastValue / cyclePeriod);
        this._gpio.pwmWrite(pwmCycle);
        if (idx >= plan.length)
        {
          idx = 0;
          this._plans.shift();
          if (this._plans.length === 0)
          {
            clearInterval(timer);
          }
        }
      }
      run();
      if (this._plans.length !== 0)
      {
        timer = setInterval(run, cyclePeriod);
      }
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
    return this._lastValue;
  },

  getTargetPulse: function()
  {
    return this._targetValue;
  },

  idle: function()
  {
  },

  setCyclePeriod: function(cycleMs)
  {
    let hz = 1000 / cycleMs;
    if ([ 8000, 4000, 2000, 1600, 1000, 800, 500, 400, 320, 250, 200, 160, 100, 80, 50, 40, 20, 10 ].indexOf(hz) === -1)
    {
      throw new Error('setCyclePeriod not suppoted');
    }
    this._gpios._setCyclePeriod(cycleMs);
    this._gpio.pwmFrequency(hz);
  },
  
  getCyclePeriod: function()
  {
    return this._gpios._cycleMs;
  },

  isPulseChanging: function()
  {
    return this._plans.length > 0;
  }

};

function gpios()
{
  const gpios =
  [
    new gpioChannel(this, 17),
    new gpioChannel(this, 18),
    new gpioChannel(this, 27),
    new gpioChannel(this, 22),
    new gpioChannel(this, 23),
    new gpioChannel(this, 24),
    new gpioChannel(this, 25),
    new gpioChannel(this, 4),
    new gpioChannel(this, 2),
    new gpioChannel(this, 3),
    new gpioChannel(this, 8),
    new gpioChannel(this, 7),
    new gpioChannel(this, 10),
    new gpioChannel(this, 9),
    new gpioChannel(this, 22),
    new gpioChannel(this, 14),
    new gpioChannel(this, 15),

    new gpioChannel(this, 5),
    new gpioChannel(this, 6),
    new gpioChannel(this, 13),
    new gpioChannel(this, 19),
    new gpioChannel(this, 26),
    new gpioChannel(this, 12),
    new gpioChannel(this, 16),
    new gpioChannel(this, 20),
    new gpioChannel(this, 21),
    new gpioChannel(this, 0),
    new gpioChannel(this, 1)
  ]
  this._channels =
  {
    WPI0: gpios[0],
    WPI1: gpios[1],
    WPI2: gpios[2],
    WPI3: gpios[3],
    WPI4: gpios[4],
    WPI5: gpios[5],
    WPI6: gpios[6],
    WPI7: gpios[7],
    WPI8: gpios[8],
    WPI9: gpios[9],
    WPI10: gpios[10],
    WPI11: gpios[11],
    WPI12: gpios[12],
    WPI13: gpios[13],
    WPI14: gpios[14],
    WPI15: gpios[15],
    WPI16: gpios[16],
    WPI21: gpios[17],
    WPI22: gpios[18],
    WPI23: gpios[19],
    WPI24: gpios[20],
    WPI25: gpios[21],
    WPI26: gpios[22],
    WPI27: gpios[23],
    WPI28: gpios[24],
    WPI29: gpios[25],
    WPI30: gpios[26],
    WPI31: gpios[27],
    
    GPIO0: gpios[0],
    GPIO1: gpios[1],
    GPIO2: gpios[8],
    GPIO3: gpios[9],
    GPIO4: gpios[7],
    GPIO5: gpios[5],
    GPIO6: gpios[6],
    GPIO7: gpios[11],
    GPIO8: gpios[10],
    GPIO9: gpios[13],
    GPIO10: gpios[12],
    GPIO11: gpios[14],
    GPIO14: gpios[15],
    GPIO15: gpios[16],
    GPIO17: gpios[0],
    GPIO18: gpios[1],
    GPIO21: gpios[17],
    GPIO22: gpios[18],
    GPIO23: gpios[19],
    GOIO24: gpios[20],
    GPIO25: gpios[21],
    GPIO26: gpios[22],
    GPIO27: gpios[23],
    GPIO28: gpios[24],
    GPIO29: gpios[25]
  };

  PIGPIO.initialize();
}

gpios.prototype =
{
  open: function(config)
  {
    if (config.channel in this._channels)
    {
      return this._channels[config.channel];
    }
    throw new Error(`Bad gpio channel: ${config.channel}`);
  },

  _setCyclePeriod: function(cycleMs)
  {
    if (this._cycleMs === undefined)
    {
      this._cycleMs = cycleMs;
      PIGPIO.configureClock(5, PIGPIO.CLOCK_PCM);
    }
    else if (this._cycleMs !== cycleMs)
    {
      throw new Error('Cannot change cycle period once set: old ' + this._cycleMs + ' new ' + cycleMs);
    }
  },
};

const _gpios = new gpios();

module.exports =
{
  open: function()
  {
    return _gpios;
  }
};
