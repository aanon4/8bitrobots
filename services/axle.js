'use strict';

console.info('Loading Axle.');

const ROSAPIAngle = require('services/ros-api-angle');
const ROSAPIVelocity = require('services/ros-api-velocity');

function axle(config)
{
  this._node = rosNode.init(config.name);
  this._left = config.left;
  this._right = config.right;
  this._steering = config.steering;
  this._lastVelocity = 0;
  this._rosApiAngle = new ROSAPIAngle(this);
  this._rosApiVelocity = new ROSAPIVelocity(this);
}

axle.prototype = 
{
  enable: function()
  {
    this._left.enable();
    this._right.enable();
    this._steering && this._steering.enable();
    this._rosApiAngle.enable();
    this._rosApiVelocity.enable();
    return this;
  },
  
  disable: function()
  {
    this._rosApiVelocity.disable();
    this._rosApiAngle.disable();
    this._steering && this._steering.disable();
    this._right.disable();
    this._left.disable();
    return this;
  },
  
  setVelocity(velocity, changeMs, func)
  {
    this._left.setVelocity(velocity, changeMs, func);
    this._right.setVelocity(velocity, changeMs, func);
    this._lastVelocity = velocity;
  },

  getCurrentVelocity: function()
  {
    return (this._left.getCurrentVelocity() + this._right.getCurrentVelocity()) / 2;
  },

  brake: function()
  {
    this._left.brake();
    this._right.brake();
    this._lastVelocity = 0;
  },

  idle: function(idle)
  {
    this._left.idle(idle);
    this._right.idle(idle);
    this._steering && this._steering.idle(idle);
  },

  isVelocityChanging: function()
  {
    return this._left.isVelocityChanging() || this._right.isVelocityChanging();
  },

  setAngle: function(angleRadians, changeMs, func)
  {
    if (this._steering)
    {
      this._steering.setAngle(angleRadians, changeMs, func);
    }
    else
    {
      let c = Math.sin(angleRadians);
      this._left.setVelocity(this._lastVelocity * (1 + c), changeMs, func);
      this._right.setVelocity(this._lastVelocity * (1 - c), changeMs, func);
    }
  },

  getCurrentAngle: function()
  {
    if (this._steering)
    {
      return this._steering.getCurrentVelocity();
    }
    else
    {
      let left = this._left.getCurrentVelocity();
      let right = this._right.getCurrentVelocity();
      let selected = right;
      if (Math.abs(left) < Math.abs(right))
      {
        selected = left;
      }
      return this._lastVelocity / selected;
    }
  },

  isAngleChanging: function()
  {
    if (this._steering)
    {
      return this._steering.isAngleChanging();
    }
    else
    {
      return false; // Unknown
    }
  }
};

module.exports = axle;
