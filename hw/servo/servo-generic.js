'use strict';

const APIAngle = require('modules/api-angle');
const ConfigManager = require('modules/config-manager');

function servo(config, settings)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._settings = settings;

  let trim = config.trim || 0;
  let minAngle = Math.max(this._settings.minAngle - trim, config.minAngle || (this._settings.minAngle - trim));
  let maxAngle = Math.min(this._settings.maxAngle - trim, config.maxAngle || (this._settings.maxAngle - trim));
  let defaultAngle = config.defaultAngle || ((minAngle + maxAngle) / 2);

  this._config = new ConfigManager(this,
  {
    trim: trim,
    minAngle: minAngle,
    maxAngle: maxAngle,
    defaultAngle: defaultAngle,
    reverse: config.reverse || false
  });

  this._pwmChannel = config.pwm;
  this._targetAngle = null;
  this._stateManager = config.stateManager;
  this._lastAngle = null;

  this._defaultRate = (config.defaultRateMs || 0) / (maxAngle - minAngle);
  this._angle2pulse = (this._settings.maxPulseMs - this._settings.minPulseMs) / (this._settings.maxAngle - this._settings.minAngle);
  this._enabled = 0;
  this._apiAngle = new APIAngle(this, config.api);
}

servo.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._pwmChannel.enable();
      this._pwmChannel.setCyclePeriod(this._settings.periodMs);

      this._config.enable();
      this._trim = this._config.get('trim');
      this._reverse = this._config.get('reverse');
      this._minAngle = this._config.get('minAngle');
      this._maxAngle = this._config.get('maxAngle');
      this._defaultAngle = this._config.get('maxAngle');

      if (this._stateManager)
      {
        this._lastAngle = this._stateManager.get(`${this._name}-angle`);
      }
      this.setAngle(this._lastAngle);
      this._apiAngle.enable();
    }
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._apiAngle.disable();
      this._lastAngle = this.getCurrentAngle();
      if (this._stateManager)
      {
        this._stateManager.set(`${this._name}-angle`, this._lastAngle);
      }
      this._pwmChannel.disable();
      this._config.disable();
    }
  },

  setAngle: function(angle, time, func)
  {
    if (this._enabled)
    {
      if (angle === undefined || angle === null)
      {
        angle = this._defaultAngle;
      }
      if (angle < this._minAngle)
      {
        angle = this._minAngle;
      }
      else if (angle > this._maxAngle)
      {
        angle = this._maxAngle;
      }
      this._targetAngle = angle;
      angle += this._trim;
      var pulse = (angle - this._settings.minAngle) * this._angle2pulse;
      if (this._reverse)
      {
        pulse = this._settings.maxPulseMs - pulse;
      }
      else
      {
        pulse = pulse + this._settings.minPulseMs;
      }
      if (time === undefined)
      {
        time = this._defaultRate ? Math.abs(this.getCurrentAngle() - angle) * this._defaultRate : 0;
      }
      this._pwmChannel.setPlan(
      [
        { end: pulse, time: time, func: func }
      ]);
    }
    else
    {
      return 0;
    }
  },

  getCurrentAngle: function()
  {
    var pulse = this._pwmChannel.getCurrentPulse();
    if (this._reverse)
    {
      pulse = this._settings.maxPulseMs - pulse; 
    }
    else
    {
      pulse = pulse - this._settings.minPulseMs;
    }
    return this._settings.minAngle + pulse / this._angle2pulse - this._trim;
  },

  getTargetAngle: function()
  {
    var pulse = this._pwmChannel.getTargetPulse();
    if (this._reverse)
    {
      pulse = this._settings.maxPulseMs - pulse; 
    }
    else
    {
      pulse = pulse - this._settings.minPulseMs;
    }
    return this._settings.minAngle + pulse / this._angle2pulse - this._trim;
  },

  waitForAngle: function(compare, angle)
  {
    return new Promise((resolve, reject) =>
    {
      if (compare !== '>=' && compare !== '<=' && compare !== '==' && compare !== 'idle')
      {
        return reject(new Error('Bad compare: ' + compare));
      }
      const check = () =>
      {
        const current = this.getCurrentAngle();
        const changing = this.isAngleChanging();
        if (compare === '>=' && current >= angle)
        {
          return resolve(true);
        }
        else if (compare === '<=' && current <= angle)
        {
          return resolve(true);
        }
        else if (compare === '==' && current == angle)
        {
          return resolve(true);
        }
        else if (!changing)
        {
          return resolve(compare === 'idle' ? true : false);
        }
        else
        {
          setTimeout(check, 20);
        }
      }
      check();
    });
  },

  isAngleChanging: function()
  {
    return this._pwmChannel.isPulseChanging();
  },

  idle: function()
  {
    this._pwmChannel.idle();
  },

  getSettings: function()
  {
    return this._settings;
  },

  getLimits: function()
  {
    return {
      minAngle: this._minAngle,
      maxAngle: this._maxAngle,
      defaultAngle: this._defaultAngle,
      reverse: this._reverse
    };
  }
};

module.exports = servo;
