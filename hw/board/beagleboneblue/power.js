'use strict';

const native = require('.');

console.info('Loading BeagleBoneBlue power monitors.');

const TOPIC_STATUS = { topic: 'status' };


function power(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  this._input = config.input;
}

power.prototype =
{
  enable: function()
  {
    this._ad = this._node.advertise(TOPIC_STATUS);
    this._clock = setInterval(() => {
      this._process();
    }, 1000);
    return this;
  },
  
  disable: function()
  {
    clearInterval(this._clock);
    this._node.unadvertise(TOPIC_STATUS);
    return this;
  },
  
  _process: function()
  {
    try
    {
      var v;
      switch (this._input)
      {
        case 'jack':
          v = native.bbb_power_jack();
          break;
  
        case 'battery':
        default:
          v = native.bbb_power_battery();
          break;
      }
      
      this._ad.publish(
      {
        v: parseFloat(v.toFixed(2))
      });
    }
    catch (e)
    {
      console.error(e.stack);
    }
  }
};

module.exports = power;
