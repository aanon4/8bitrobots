'use strict';

console.info('Loading RaspberryPi GPIO controllers.');

let WPI;
if (!SIMULATOR)
{
  WPI = require('wiringpi');
}
else
{
  WPI =
  {
    setup: function() {},
    digitalRead: function() {},
    digitalWrite: function() {},
    pinMode: function() {},
    wiringPiISR: function() {}
  };
}

function gpioChannel(gpios, subaddress)
{
  this._gpios = gpios;
  this._subaddress = subaddress;
  this._created = false;
  this._enabled = false;
  this._lastValue = null;
  this._lastDir = null;
  this._callbacks = null;
  this._timer = null;
}

gpioChannel.prototype =
{
  id: function()
  {
    return this._subaddress;
  },

  set: function(value)
  {
    if (this._enabled && value !== this._lastValue)
    {
      if (this._lastDir != 'output')
      {
        this.dir('output');
      }
      WPI.digitalWrite(this._subaddress, value ? 1 : 0);
      this._lastValue = value;
    }
  },

  get: function()
  {
    if (this._enabled)
    {
      if (this._lastDir != 'input')
      {
        this.dir('input');
      }
      return WPI.digitalRead(this._subaddress);
    }
    else
    {
      return -1;
    }
  },

  dir: function(dir)
  {
    if (this._enabled && dir !== this._lastDir)
    {
      this._lastDir = dir;
      if (dir != 'output')
      {
        dir = WPI.INPUT;
      }
      else
      {
        dir = WPI.OUTPUT;
      }
      WPI.pinMode(this._subaddress, dir);
    }
  },

  onEdge: function(edge, callback)
  {
    if (this._lastDir != 'input')
    {
      this.dir('input');
    }
    if (!this._callbacks)
    {
      this._callbacks = [];
      WPI.wiringPiISR(this._subaddress, edge == 'rising' ? WPI.INT_EDGE_RISING : edge == 'falling' ? WPI.INT_EDGE_FALLING : WPI.INT_EDGE_BOTH, () => {
        let value = this.get();
        this._callbacks.forEach((fn) =>
        {
          fn(value);
        });
      });
    }
    this._callbacks.push(callback);
  },

  enable: function()
  {
    return this;
  },

  disable: function()
  {
    return this;
  }
};

function gpios()
{
  WPI.setup('wpi');

  this._channels =
  [
    new gpioChannel(this, 0),
    new gpioChannel(this, 1),
    new gpioChannel(this, 2),
    new gpioChannel(this, 3),
    new gpioChannel(this, 4),
    new gpioChannel(this, 5),
    new gpioChannel(this, 6),
    new gpioChannel(this, 7),
    new gpioChannel(this, 8),
    new gpioChannel(this, 9),
    new gpioChannel(this, 10),
    new gpioChannel(this, 11),
    new gpioChannel(this, 12),
    new gpioChannel(this, 13),
    new gpioChannel(this, 14),
    new gpioChannel(this, 15),
    new gpioChannel(this, 16)
  ];
}

gpios.prototype =
{
  open: function(config)
  {
    if (config.channel >= 0 && config.channel < this._channels.length)
    {
      return this._channels[config.channel];
    }
    throw new Error('Bad gpio channel');
  }
};

const _gpios = new gpios();

module.exports =
{
  open: function()
  {
    return _gpios;
  }
};
