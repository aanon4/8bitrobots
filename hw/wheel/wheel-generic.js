'use strict';

const ROSAPIVelocity = require('services/ros-api-velocity');


function wheel(config, settings)
{
  this._node = rosNode.init(config.name);
  this._config = config;
  // Diameter is in mm, rpm is in revolutions / minutues, velocity is in meters / second
  this._track = Math.PI * settings.diameter / 1000 / 60; // m
  this._motor = config.motor;
  this._rosApiVelocity = new ROSAPIVelocity(this, config.ros);
}

wheel.prototype =
{
  enable: function()
  {
    this._motor.enable();
    this._rosApiVelocity.enable();
    return this;
  },

  disable: function()
  {
    this._rosApiVelocity.disable();
    this._motor.disable();
    return this;
  },

  setVelocity: function(velocity, changeMs, func)
  {
    this._motor.setRPM(velocity / this._track, changeMs, func);
  },

  getCurrentVelocity: function()
  {
    return this._motor.getCurrentRPM() * this._track;
  },

  brake: function()
  {
    this._motor.brake();
  },

  idle: function(idle)
  {
    this._motor.idle(idle);
  },

  isVelocityChanging: function()
  {
    return this._motor.isRPMChanging();
  },

  waitForVelocity: function(compare, velocity)
  {
    return new Promise((resolve, reject) =>
    {
      if (compare !== '>=' && compare !== '<=' && compare !== '==' && compare !== 'idle')
      {
        return reject(new Error('Bad compare: ' + compare));
      }
      let check = () =>
      {
        let current = this.getCurrentVelocity();
        let changing = this.isVelocityChanging();
        if (compare === '>=' && current >= velocity)
        {
          return resolve(true);
        }
        else if (compare === '<=' && current <= velocity)
        {
          return resolve(true);
        }
        else if (compare === '==' && current == velocity)
        {
          return resolve(true);
        }
        else if (!changing)
        {
          return resolve(compare === 'idle' ? true : false);
        }
        else
        {
          setTimeout(check, 100);
        }
      }
      check();
    });
  }
};

module.exports = wheel;
