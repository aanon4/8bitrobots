'use strict';

console.info('Loading Tank Axle.');

const APIAngle = require('modules/api-angle');
const APIVelocity = require('modules/api-velocity');

function axle(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._left = config.left;
  this._right = config.right;
  this._maxVelocity = config.maxVelocity;
  this._lastVelocity = 0;
  this._lastAngle = 0;
  this._enabled = 0;
  this._apiAngle = new APIAngle(this, config.api);
  this._apiVelocity = new APIVelocity(this, config.api);
}

axle.prototype = 
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._left && this._left.enable();
      this._right && this._right.enable();
      this._apiAngle.enable();
      this._apiVelocity.enable();
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._apiVelocity.disable();
      this._apiAngle.disable();
      this._right && this._right.disable();
      this._left && this._left.disable();
    }
    return this;
  },
  
  setVelocity(velocity, changeMs, func)
  {
    this._lastVelocity = velocity;
    this._setTankVelocity(changeMs, func);
  },

  getCurrentVelocity: function()
  {
    return (this._left.getCurrentVelocity() + this._right.getCurrentVelocity()) / (2 * this._maxVelocity);
  },

  brake: function()
  {
    this._left.brake();
    this._right.brake();
    this._lastVelocity = 0;
  },

  idle: function()
  {
    this._left.idle();
    this._right.idle();
  },

  isVelocityChanging: function()
  {
    return this._left.isVelocityChanging() || this._right.isVelocityChanging();
  },

  setAngle: function(angleRadians, changeMs, func)
  {
    this._lastAngle = angleRadians;
    this._setTankVelocity(changeMs, func);
  },

  getCurrentAngle: function()
  {
    return this._lastAngle; // Appoximate, rather than calculate the actual current angle
  },

  isAngleChanging: function()
  {
    return this._left.isVelocityChanging() || this._right.isVelocityChanging(); // Approximate, because they could be changing at the same rate
  },

  _setTankVelocity: function(changeMs, func)
  {
    const PI2 = Math.PI / 2;
    const angle = Math.abs(this._lastAngle);

    let left = 1;
    let right = 1;
    if (angle < PI2)
    {
      left = 1.2 * angle / PI2 - 0.2;
    }
    else if (angle > PI2)
    {
      right = -1.2 * angle / PI2 + 2.2;
    }

    this._left.setVelocity(this._maxVelocity * Math.min(Math.max((this._lastVelocity * left), -1), 1), changeMs, func);
    this._right.setVelocity(this._maxVelocity * Math.min(Math.max((this._lastVelocity * right), -1), 1), changeMs, func);
  }
};

module.exports = axle;
