function servo(config, settings)
{
  this._name = config.name;
  this._pwmChannel = config.pwm;
  this._settings = settings;
  this._direction = 0;
  this._end = 0;
  this._pwmChannel.setCyclePeriod(this._settings.periodMs);
}

servo.prototype =
{
  setDirection: function(direction, timeMs)
  {
    if (direction === 0)
    {
      this._pwmChannel.setPulse(this._settings.stopPulseMs, 0);
    }
    else if (direction < 0)
    {
      this._pwmChannel.setPulse(this._settings.backwardPulseMs, timeMs);
    }
    else
    {
      this._pwmChannel.setPulse(this._settings.forwardPulseMs, timeMs);
    }
    this._direction = direction;
    this._end = Date.now() + timeMs;
  },
  
  getDirection: function()
  {
    if (Date.now() >= this._end)
    {
      return 0;
    }
    else
    {
      return this._direction;
    }
  },

  isChanging: function()
  {
    return this.getDirection() !== 0;
  },

  enable: function()
  {
    this._pwmChannel.enable();
  },

  disable: function()
  {
    this._pwmChannel.disable();
  },

  getSettings: function()
  {
    return this._settings;
  }
};

module.exports = servo;
