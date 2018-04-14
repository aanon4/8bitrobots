'use strict';

const APIVelocity = require('modules/api-velocity');


function wheel(config, settings)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._config = config;
  // Diameter is in mm, rpm is in revolutions / minutues, velocity is in meters / second
  this._track = Math.PI * settings.diameter / 1000 / 60; // m
  this._motor = config.motor;
  this._apiVelocity = new APIVelocity(this, config.api);
}

wheel.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._motor.enable();
      this._apiVelocity.enable();
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._apiVelocity.disable();
      this._motor.disable();
    }
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

  idle: function()
  {
    this._motor.idle();
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
