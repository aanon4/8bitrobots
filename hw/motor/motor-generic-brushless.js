function motor(config, settings)
{
  this._esc = config.esc;
  this._settings = settings;
  this._enabled = false;
}

motor.prototype =
{
  getSettings: function()
  {
    return this._settings;
  },

  getEsc: function()
  {
    return this._esc;
  },

  setPulse: function(pulseMs, changeMs)
  {
    this._esc.setPulse(pulseMs, changeMs);
  },

  getCurrentPulse: function()
  {
    return this._esc.getCurrentPulse();
  },

  enable: function()
  {
    this._enabled = true;
    this._esc.enable();
    return this;
  },

  disable: function()
  {
    this._enabled = false;
    this._esc.disable();
    return this;
  }
};

module.exports = motor;
