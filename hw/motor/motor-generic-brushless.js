function motor(config, settings)
{
  this._esc = config.esc;
  this._esc.setKV(settings.kV);
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
    return this._esc.setRPM(rpm, changeMs, func);
  },

  getCurrentRPM: function()
  {
    return this._esc.getCurrentRPM();
  },

  isRPMChanging: function()
  {
    return this._esc.isRPMChanging();
  }
};

module.exports = motor;
