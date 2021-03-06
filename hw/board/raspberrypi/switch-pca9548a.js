'use strict';

const native = require('.');

console.info('Loading I2C PCA9548A switches.');

function swtch(config)
{
  this._name = config.name;
  this._enabled = 0;
  native.pca9548a_create(config.i2c.address(), config.defaultChannels || 0);
}

swtch.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      native.i2clock_lock(1);
      this.setChannel(-1); // Just enable default channels
      native.i2clock_lock(0);
    }
    return this;
  },
  
  disable: function()
  {
    --this._enabled;
    return this;
  },
  
  setChannel: function(channel)
  {
    native.pca9548a_setChannel(channel);
  }
};

module.exports = swtch;
