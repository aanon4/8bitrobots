function cservo(config, settings)
{
  this._name = config.name;
  this._enabled = 0;
  this._pwmChannel = config.pwm;
  this._settings = settings;
  this._direction = config.reverse ? -1 : 1;
  this._volts = config.volts || this._settings.minV;
  this._trimMs = config.trim || 0;
  this._pwmChannel.setCyclePeriod(this._settings.periodMs);
  this._bands = this._settings.bands;
}

cservo.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._pwmChannel.enable();
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._pwmChannel.disable();
    }
    return this;
  },

  setRPM: function(rpm, changeMs, func)
  {
    if (rpm == 0)
    {
      const value = (this._bands.n[0] + this._bands.n[1]) / 2;
      this._pwmChannel.setPulse(value, changeMs, func);
    }
    else
    {
      const dir = (rpm > 0 ? this._direction : -this._direction);
      const band = (dir == 1 ? this._bands.cw : this._bands.ccw);
      const maxRPM = this._volts * this._settings.kV;
      const arpm = Math.abs(rpm) > maxRPM ? maxRPM : Math.abs(rpm);
      const fraction = arpm / maxRPM;
      const value = band[0] + (fraction * (band[1] - band[0]));
      this._pwmChannel.setPulse(value, changeMs, func);
    }
  },

  getCurrentRPM: function()
  {
    let pulse = this._pwmChannel.getCurrentPulse();
    if (pulse > this._bands.n[0] && pulse < this._bands.n[1])
    {
      return 0;
    }
    const maxRPM = this._volts * this._settings.kV;
    for (let k in this._bands)
    {
      const band = this._bands[k];
      if ((band[0] <= band[1] && pulse >= band[0] && pulse <= band[1]) || (band[0] > band[1] && pulse >= band[1] && pulse <= band[0]))
      {
        const fraction = (pulse - band[0]) / (band[1] - band[0]);
        return fraction * maxRPM * (k === 'ccw' ? -this._direction : this._direction);
      }
    }
    return null;
  },

  isRPMChanging: function()
  {
    return this._pwmChannel.isPulseChanging();
  },

  idle: function()
  {
    this._pwmChannel.idle();
  },

  brake: function()
  {
    this.setRPM(0);
  }
};

module.exports = cservo;
