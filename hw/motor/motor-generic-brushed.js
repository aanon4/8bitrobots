'use strict';

function motor(config, settings)
{
  this._hbridge = config.hbridge;
  this._scale = config.reverse ? -1 : 1;
  this._last = null;
  this._enabled = false;
  this._hbridge.setKV(settings.kV);
  this._hbridge.setCyclePeriod(settings.periodMs);
}

motor.prototype =
{
  setRPM: function(rpm, timeMs, func, callback)
  {
    if (this._enabled && rpm !== this._last)
    {
      this._hbridge.setRPM(rpm * this._scale, timeMs, func);
      this._last = rpm;
      this._changing(callback);
    }
  },

  getCurrentRPM: function()
  {
    return this._hbridge.getCurrentRPM() * this._scale;
  },

  brake: function(callback)
  {
    if (this._enabled)
    {
      this._hbridge.brake();
      this._last = 0;
      this._changing(callback);
    }
  },

  idle: function(idle)
  {
    this._hbridge.idle(idle);
  },

  isRPMChanging: function()
  {
    return this._hbridge.isRPMChanging();
  },

  enable: function()
  {
    this._hbridge.enable();
    this._enabled = true;
    return this;
  },

  disable: function()
  {
    this._enabled = false;
    this._hbridge.disable();
    return this;
  },

  _changing: function(callback)
  {
    if (!callback)
    {
      return;
    }
    let adtimer = setInterval(() =>
    {
      let changing = this.isChanging();
      calback({ rpm: this.getCurrentRPM(), target_rpm: this._last, changing: changing });
      if (!changing)
      {
        clearInterval(adtimer);
      }
    }, 20);
  }
};

module.exports = motor;
