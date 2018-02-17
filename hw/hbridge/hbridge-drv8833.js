'use strict';

console.info('Loading DRV8833 H-Bridge controllers.');

function hbridgeChannel(config)
{
  this._in1 = config.in1;
  this._in2 = config.in2;
  this._v = config.v;
  this._enabled = false;
  this._targetRPM = null;
  this._kV = 0;
}

hbridgeChannel.prototype =
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
      this._in1.setPulse(duty, changeMs, func);
      this._in2.setPulse(0, changeMs, func);
    }
    else
    {
      duty = Math.max(-1.0, rpm / maxRPM);
      this._in1.setPulse(0, changeMs, func);
      this._in2.setPulse(-duty, changeMs, func);
    }
    this._targetRPM = maxRPM * duty;
  },

  getCurrentRPM: function()
  {
    const maxRPM = this._maxRPM();
    let pulse = this._in1.getCurrentPulse();
    if (pulse != 0)
    {
      return maxRPM * pulse;
    }
    else
    {
      return -this._in2.getCurrentPulse() * maxRPM;
    }
  },

  _maxRPM: function()
  {
    return this._kV * this._v;
  },

  getTargetRPM: function()
  {
    return this._targetRPM;
  },

  enable: function()
  {
    if (!this._enabled)
    {
      this._enabled = true;
      this.idle(false);
    }
    return this;
  },

  disable: function()
  {
    if (this._enabled)
    {
      this._enabled = false;
      this.idle(true);
    }
    return this;
  },

  idle: function()
  {
    this._in1.idle();
    this._in2.idle();
  },

  brake: function()
  {
    this._in1.setPulse(1, changeMs, func);
    this._in2.setPulse(1, changeMs, func);
  },

  setKVandPoles: function(kV, poles)
  {
    this._kV = kV;
  },

  setCyclePeriod: function(cycleMs)
  {
    this._in1.setCyclePeriod(cycleMs);
    this._in2.setCyclePeriod(cycleMs);
  },
  
  getCyclePeriod: function()
  {
    return this._in1.getCyclePeriod();
  },

  isRPMChanging: function()
  {
    return this._in1.isPulseChanging() || this._in2.isPulseChanging();
  }
};

function hbridge(config)
{
  this._channels =
  [
    new hbridgeChannel(
    {
      v: config.v,
      in1: config.ain1,
      in2: config.ain2
    }),
    new hbridgeChannel(
    {
      v: config.v,
      in1: config.bin1,
      in2: config.bin2
    })
  ];
  this._enabled = false;
}

hbridge.prototype =
{
  open: function(config)
  {
    if (config.channel < 0 || config.channel >= this._channels.length)
    {
      throw new Error('Bad hbridge channel');
    }
    return this._channels[config.channel];
  }
};

module.exports = hbridge;
