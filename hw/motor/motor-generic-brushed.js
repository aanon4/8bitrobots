'use strict';

const ConfigManager = require('modules/config-manager');

function motor(config, settings)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._config = new ConfigManager(this,
  {
    reverse: config.reverse || false
  });
  this._hbridge = config.hbridge;
  this._last = null;
  this._enabled = 0;
  this._hbridge.setKVandPoles(settings.kV, 1);
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

  idle: function()
  {
    this._hbridge.idle();
  },

  isRPMChanging: function()
  {
    return this._hbridge.isRPMChanging();
  },

  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._config.enable();
      this._hbridge.enable();
      this._scale = this._config.get('reverse') ? -1 : 1;
    };
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._hbridge.disable();
      this._config.disable();
    }
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
