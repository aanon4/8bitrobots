function esc(config, settings)
{
  this._pwmChannel = config.pwm;
  this._settings = settings;
  if (this._settings.neutralPulseMs !== undefined)
  {
    this._neutralPulseMs = this._settings.neutralPulseMs;
  }
  else if (this._settings.neutralLowMs !== undefined && this._settings.neutralHighMs !== undefined)
  {
    this._neutralPulseMs = (this._settings.neutralLowMs + this._settings.neutralHighMs) / 2;
  }
  else
  {
    this._neutralPulseMs = (this._settings.minPulseMs + this._settings.maxPulseMs) / 2;
  }
  if (this._settings.neutralLowMs === undefined)
  {
    this._neutralLowMs = this._neutralPulseMs;
  }
  if (this._settings.neutralHighMs === undefined)
  {
    this._neutralHighMs = this._neutralPulseMs;
  }
  this._pwmChannel.setCyclePeriod(this._settings.periodMs);
}

esc.prototype =
{
  setPulse: function(pulseMs, changeMs)
  {
    this._pwmChannel.setPulse(pulseMs, changeMs || 0);
  },

  getCurrentPulse: function()
  {
    return this._pwmChannel.getCurrentPulse();
  },

  isChanging: function()
  {
    return this._pwmChannel.isChanging();
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
    return {
      neutralLowMs: this._neutralLowMs,
      neutralHighMs: this._neutralHighMs,
      neutralPulseMs: this._neutralPulseMs,
      minPulseMs: this._settings.minPulseMs,
      maxPulseMs: this._settings.maxPulseMs,
      periodMs: this._settings.periodMs,
      efficiency: this._settings.efficiency
    };
  }
};

module.exports = esc;
