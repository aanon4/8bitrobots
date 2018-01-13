'use strict';

console.info('Loading RaspberryPi GPIO controllers.');

let WPI;
if (!SIMULATOR)
{
  WPI = require('wiringpi-node');
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
  this._enabled = false;
  this._lastValue = null;
  this._lastDir = null;
  this._callbacks = null;
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
    this._enabled = true;
    return this;
  },

  disable: function()
  {
    this._enabled = false;
    return this;
  }
};

function gpios()
{
  WPI.setup('wpi');

  const gpios =
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
  ]
  this._channels =
  {
    WPI0: gpios[0],
    WPI1: gpios[1],
    WPI2: gpios[2],
    WPI3: gpios[3],
    WPI4: gpios[4],
    WPI5: gpios[5],
    WPI6: gpios[6],
    WPI7: gpios[7],
    WPI8: gpios[8],
    WPI9: gpios[9],
    WPI10: gpios[10],
    WPI11: gpios[11],
    WPI12: gpios[12],
    WPI13: gpios[13],
    WPI14: gpios[14],
    WPI15: gpios[15],
    WPI16: gpios[16],
    
    GPIO2: gpios[8],
    GPIO3: gpios[9],
    GPIO4: gpios[7],
    GPIO7: gpios[11],
    GPIO8: gpios[10],
    GPIO9: gpios[13],
    GPIO10: gpios[12],
    GPIO11: gpios[14],
    GPIO14: gpios[15],
    GPIO15: gpios[16],
    GPIO17: gpios[0],
    GPIO18: gpios[1],
    GPIO22: gpios[3],
    GPIO23: gpios[4],
    GOIO24: gpios[5],
    GPIO25: gpios[6],
    GPIO27: gpios[2]
  };
}

gpios.prototype =
{
  open: function(config)
  {
    if (config.channel in this._channels)
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
