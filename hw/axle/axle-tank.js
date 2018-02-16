'use strict';

console.info('Loading Tank Axle.');

const APIAngle = require('modules/8bit-api-angle');
const APIVelocity = require('modules/8bit-api-velocity');

function axle(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._left = config.left;
  this._right = config.right;
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
    this._left && this._left.enable();
    this._right && this._right.enable();
    this._apiAngle.enable();
    this._apiVelocity.enable();
    return this;
  },
  
  disable: function()
  {
    this._apiVelocity.disable();
    this._apiAngle.disable();
    this._right && this._right.disable();
    this._left && this._left.disable();
    return this;
  },
  
  setVelocity(velocity, changeMs, func)
  {
    this._lastVelocity = Math.min(Math.max(velocity, -1), 1);
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

  idle: function(idle)
  {
    this._left.idle(idle);
    this._right.idle(idle);
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
    if (this._lastVelocity == 0)
    {
      return Math.PI / 2;
    }
    else
    {
      return Math.acos(this._right.getCurrentVelocity() / this._lastVelocity - 1);
    }
  },

  isAngleChanging: function()
  {
    return this._left.isVelocityChanging() || this._right.isVelocityChanging(); // Approximate, because they could be changing at the same rate
  },

  _setTankVelocity: function(changeMs, func)
  {
    let tank = Math.cos(this._lastAngle) / 2;
    this._left.setVelocity(this._maxVelocity * Math.min(Math.max((this._lastVelocity + tank), -1), 1), changeMs, func);
    this._right.setVelocity(this._maxVelocity * Math.min(Math.max((this._lastVelocity - tank), -1), 1), changeMs, func);
  }
};

module.exports = axle;
