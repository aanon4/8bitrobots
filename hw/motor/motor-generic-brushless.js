function motor(config, settings)
{
  this._name = config.name;
  this._esc = config.esc;
  this._esc.setKVandPoles(settings.kV, settings.poles);
  this._scale = config.reverse ? -1 : 1;
}

motor.prototype =
{
  enable: function()
  {
    this._esc.enable();
    return this;
  },

  disable: function()
  {
    this._esc.disable();
    return this;
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
  }
};

module.exports = motor;
