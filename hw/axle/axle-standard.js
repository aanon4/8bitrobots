'use strict';

console.info('Loading Standard Axle.');

const APIAngle = require('modules/api-angle');
const APIVelocity = require('modules/api-velocity');

function axle(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._drive = config.drive;
  this._steering = config.steering;
  this._maxVelocity = config.maxVelocity;
  this._lastVelocity = 0;
  this._lastAngle = 0;
  this._apiAngle = new APIAngle(this, config.api);
  this._apiVelocity = new APIVelocity(this, config.api);
}

axle.prototype = 
{
  enable: function()
  {
    this._drive && this._drive.enable();
    this._steering && this._steering.enable();
    this._apiAngle.enable();
    this._apiVelocity.enable();
    return this;
  },
  
  disable: function()
  {
    this._apiVelocity.disable();
    this._apiAngle.disable();
    this._steering && this._steering.disable();
    this._drive && this._drive.disable();
    return this;
  },
  
  setVelocity(velocity, changeMs, func)
  {
    this._lastVelocity = Math.min(Math.max(velocity, -1), 1);
    if (this._drive)
    {
      this._drive.setVelocity(velocity * this._maxVelocity, changeMs, func);
    }
    else
    {
      this._setTankVelocity(changeMs, func);
    }
  },

  getCurrentVelocity: function()
  {
    return this._drive.getCurrentVelocity() / this._maxVelocity;
  },

  brake: function()
  {
    this._drive.brake();
    this._lastVelocity = 0;
  },

  idle: function()
  {
    this._drive.idle();
    this._steering.idle();
  },

  isVelocityChanging: function()
  {
    return this._drive.isVelocityChanging();
  },

  setAngle: function(angleRadians, changeMs, func)
  {
    this._lastAngle = angleRadians;
    this._steering.setAngle(angleRadians, changeMs, func);
  },

  getCurrentAngle: function()
  {
    return this._steering.getCurrentAngle();
  },

  isAngleChanging: function()
  {
    return this._steering.isAngleChanging();
  }
};

module.exports = axle;
