import { setInterval } from 'timers';

console.info('Loading Afro Opto 12A ESCs.');

const settings =
{
  minPulseMs:     1.0,
  maxPulseMs:     2.0,
  neutralPulseMs: 1.5,
  periodMs:       20,
};

function esc(config)
{
  this._node = Node.init(config.name);
  this._pwmChannel = config.pwm;
  this._maxRPM = 0;
  this._powerTopic = config.power;
  this._pwmChannel.setCyclePeriod(settings.periodMs);
}

esc.prototype =
{
  enable: function()
  {
    this._node.subscribe(this._powerTopic, (event) =>
    {
      this._maxRPM = event.v * this._kV;
    });
    this._pwmChannel.enable();
    this._enabled = true;
    return this;
  },

  disable: function()
  {
    this._enabled = false;
    this._pwmChannel.disable();
    this._node.unsubscribe(this._powerTopic);
    return this;
  },

  setRPM: function(rpm, changeMs, func)
  {
    if (rpm === 0 || this._maxRPM === 0)
    {
      this._pwmChannel.setPulse(settings.neutralPulseMs, changeMs, func);
    }
    else if (rpm > 0)
    {
      this._pwmChannel.setPulse(settings.neutralPulseMs + Math.min(1.0, rpm / this._maxRPM) * (settings.maxPulseMs - settings.neutralPulseMs), changeMs, func);
    }
    else
    {
      this._pwmChannel.setPulse(settings.neutralPulseMs + Math.max(-1.0, rpm / this._maxRPM) * (settings.neutralPulseMs - settings.minPulseMs), changeMs, func);
    }
  },

  getCurrentRPM: function()
  {
    let pulse = this._pwmChannel.getCurrentPulse();
    if (pulse == settings.neutralPulseMs)
    {
      return 0;
    }
    else if (pulse > settings.neutralPulseMs)
    {
      return (pulse - settings.neutralPulseMs) / (settings.maxPulseMs - settings.neutralPulseMs) * this._maxRPM;
    }
    else
    {
      return (pulse - settings.neutralPulseMs) / (settings.neutralPulseMs - settings.minPulseMs) * this._maxRPM;
    }
  },

  isRPMChanging: function()
  {
    return this._pwmChannel.isPulseChanging();
  },

  setKVandPoles: function(kV, poles)
  {
    this._kV = kV;
  }
};

module.exports = esc;
