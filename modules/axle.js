'use strict';

console.info('Loading Axle.');

const APIAngle = require('modules/8bit-api-angle');
const APIVelocity = require('modules/8bit-api-velocity');

function axle(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._left = config.left;
  this._right = config.right;
  this._drive = config.drive;
  this._steering = config.steering;
  this._lastVelocity = 0;
  this._apiAngle = new APIAngle(this, config.api);
  this._apiVelocity = new APIVelocity(this, config.api);
}

axle.prototype = 
{
  enable: function()
  {
    this._left && this._left.enable();
    this._right && this._right.enable();
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
    this._right && this._right.disable();
    this._left && this._left.disable();
    return this;
  },
  
  setVelocity(velocity, changeMs, func)
  {
    if (this._drive)
    {
      this._drive.setVelocity(velocity, changeMs, func);
    }
    else
    {
      this._left.setVelocity(velocity, changeMs, func);
      this._right.setVelocity(velocity, changeMs, func);
    }
    this._lastVelocity = velocity;
  },

  getCurrentVelocity: function()
  {
    if (this._drive)
    {
      return this._drive.getCurrentVelocity();
    }
    else
    {
      return (this._left.getCurrentVelocity() + this._right.getCurrentVelocity()) / 2;
    }
  },

  brake: function()
  {
    if (this._drive)
    {
      this._drive.brake();
    }
    else
    {
      this._left.brake();
      this._right.brake();
    }
    this._lastVelocity = 0;
  },

  idle: function(idle)
  {
    if (this._drive)
    {
      this._drive.idle(idle);
      this._steering.idle(idle);
    }
    else
    {
      this._left.idle(idle);
      this._right.idle(idle);
    }
  },

  isVelocityChanging: function()
  {
    if (this._drive)
    {
      return this._drive.isVelocityChanging();
    }
    else
    {
      return this._left.isVelocityChanging() || this._right.isVelocityChanging();
    }
  },

  setAngle: function(angleRadians, changeMs, func)
  {
    if (this._steering)
    {
      this._steering.setAngle(angleRadians, changeMs, func);
    }
    else
    {
      let c = Math.cos(angleRadians);
      this._left.setVelocity(this._lastVelocity * (1 + c), changeMs, func);
      this._right.setVelocity(this._lastVelocity * (1 - c), changeMs, func);
    }
  },

  getCurrentAngle: function()
  {
    if (this._steering)
    {
      return this._steering.getCurrentAngle();
    }
    else
    {
      if (this._lastVelocity == 0)
      {
        return Math.PI / 2;
      }
      else
      {
        return Math.acos(this._left.getCurrentVelocity() / this._lastVelocity - 1);
      }
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
      return this._left.isVelocityChanging() || this._right.isVelocityChanging(); // Approximate, because they could be changing at the same rate
    }
  }
};

module.exports = axle;
