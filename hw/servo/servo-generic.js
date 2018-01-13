'use strict';

const ROSAPIAngle = require('services/ros-api-angle');

function servo(config, settings)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  this._pwmChannel = config.pwm;
  this._settings = settings;
  this._trim = config.trim || 0;
  this._scale = config.scale || 1;
  this._defaultAngle = this._scale * config.defaultAngle || 0;
  this._targetAngle = null;
  this._stateManager = config.stateManager;
  this._lastAngle = null;
  this._minAngle = Math.max(this._settings.minAngle - this._trim, config.minAngle || (this._settings.minAngle - this._trim));
  this._maxAngle = Math.min(this._settings.maxAngle - this._trim, config.maxAngle || (this._settings.maxAngle - this._trim));
  this._defaultAngle = config.defaultAngle || ((this._minAngle + this._maxAngle) / 2);
  this._defaultRate = (config.defaultRateMs || 0) / (this._maxAngle - this._minAngle);
  this._reverse = config.reverse || false;
  this._angle2pulse = (this._settings.maxPulseMs - this._settings.minPulseMs) / (this._settings.maxAngle - this._settings.minAngle);
  this._enabled = false;
  this._rosApiAngle = new ROSAPIAngle(this, config.ros);
}

servo.prototype =
{
  setAngle: function(angle, time, func)
  {
    if (this._enabled)
    {
      if (angle === undefined || angle === null)
      {
        angle = this._defaultAngle;
      }
      else
      {
        angle *= this._scale;
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
      let check = () =>
      {
        let current = this.getCurrentAngle();
        let changing = this.isAngleChanging();
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

  enable: function()
  {
    if (this._enabled)
    {
      return;
    }
    this._enabled = true;
    this._pwmChannel.enable();
    this._pwmChannel.setCyclePeriod(this._settings.periodMs);
    if (this._stateManager)
    {
      this._lastAngle = this._stateManager.get(`${this._name}-angle`);
    }
    this.setAngle(this._lastAngle);
    this._rosApiAngle.enable();
  },

  disable: function()
  {
    if (!this._enabled)
    {
      return;
    }
    this._enabled = false;
    this._rosApiAngle.disable();
    this._lastAngle = this.getCurrentAngle();
    if (this._stateManager)
    {
      this._stateManager.set(`${this._name}-angle`, this._lastAngle);
    }
    this._pwmChannel.disable();
  },

  idle: function(idle)
  {
    this._pwmChannel.idle(idle);
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
