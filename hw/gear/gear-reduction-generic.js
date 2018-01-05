function reduction(config, settings)
{
  this._next = config.next;
  this._scale = settings.scale;
}

reduction.prototype =
{
  enable: function()
  {
    this._next.enable();
    return this;
  },

  disable: function()
  {
    this._next.disable();
    return this;
  },

  setRPM: function(rpm, changeMs, func)
  {
    return this._next.setRPM(rpm * this._scale, changeMs, func);
  },

  getCurrentRPM: function()
  {
    return this._next.getCurrentRPM() / this._scale;
  },

  isRPMChanging: function()
  {
    return this._next.isRPMChanging();
  }
};

module.exports = reduction;
