'use strict';

const ConfigManager = require('modules/config-manager');

function motor(config, settings)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._config = new ConfigManager(this,
  {
    reverse: config.reverse || false
  });
  this._esc = config.esc;
  this._esc.setKVandPoles(settings.kV, settings.poles);
  this._config.enable();
}

motor.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._esc.enable();
      this._scale = this._config.get('reverse') ? -1 : 1;
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._esc.disable();
    }
    return this;
  },

  reconfigure: function()
  {
    this._scale = this._config.get('reverse') ? -1 : 1;
  },

  setRPM: function(rpm, changeMs, func)
  {
    return this._esc.setRPM(rpm * this._scale, changeMs, func);
  },

  getCurrentRPM: function()
  {
    return this._esc.getCurrentRPM() * this._scale;
  },

  isRPMChanging: function()
  {
    return this._esc.isRPMChanging();
  },

  idle: function()
  {
    return this._esc.idle();
  }
};

module.exports = motor;
