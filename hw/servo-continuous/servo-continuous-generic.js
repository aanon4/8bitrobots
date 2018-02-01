function cservo(config, settings)
{
  this._name = config.name;
  this._pwmChannel = config.pwm;
  this._settings = settings;
  this._direction = config.reverse ? -1 : 1;
  this._volts = config.volts || this._settings.minV;
  this._pwmChannel.setCyclePeriod(this._settings.periodMs);

  // Calculate forward and backward bands
  this._forward =
  {
    slow: (this._settings.minPulse + this._settings.maxPulse + this._settings.deadBand) / 2,
    fast: this._settings.maxPulse
  };
  this._neutral =
  {
    bottom: (this._settings.minPulse + this._settings.maxPulse - this._settings.deadBand) / 2,
    top: (this._settings.minPulse + this._settings.maxPulse + this._settings.deadBand) / 2
  };
  this._backward =
  {
    slow: (this._settings.minPulse + this._settings.maxPulse - this._settings.deadBand) / 2,
    fast: this._settings.minPulse
  };
}

cservo.prototype =
{
  enable: function()
  {
    this._pwmChannel.enable();
    return this;
  },

  disable: function()
  {
    this._pwmChannel.disable();
    return this;
  },

  setRPM: function(rpm, changeMs, func)
  {
    if (rpm == 0)
    {
      const value = (this._neutral.bottom + this._neutral.top) / 2;
      this._pwmChannel.setPulse(value, changeMs, func);
    }
    else
    {
      const dir = (rpm > 0 ? this._direction : -this._direction);
      const maxRPM = this._volts * this._settings.kV;
      rpm = Math.abs(rpm) > maxRPM ? maxRPM : Math.abs(rpm);
      const fraction = rpm / maxRPM;
      if (dir === 1)
      {
        const value = this._forward.slow + (fraction * (this._forward.fast - this._forward.slow));
        this._pwmChannel.setPulse(value, changeMs, func);
      }
      else
      {
        const value = this._backward.slow - (fraction * (this._backward.slow - this._backward.fast));
        this._pwmChannel.setPulse(value, changeMs, func);
      }
    }
  },

  getCurrentRPM: function()
  {
    let pulse = this._pwmChannel.getCurrentPulse();
    if (pulse > this._neutral.bottom && pulse < this._neutral.top)
    {
      return 0;
    }
    else if (pulse > this._forward.slow)
    {
      const rpm = (pulse - this._forward.slow) / (this._forward.fast - this._forward.slow);
      return rpm * this._direction;
    }
    else
    {
      const rpm = (pulse - this._backward.slow) / (this._backward.slow - this._backward.fast);
      return rpm * this._direction;
    }
  },

  isRPMChanging: function()
  {
    return this._pwmChannel.isPulseChanging();
  },

  idle: function(idle)
  {
    this._pwmChannel.idle(idle);
  },

  brake: function()
  {
    this.setRPM(0);
  }
};

module.exports = cservo;
