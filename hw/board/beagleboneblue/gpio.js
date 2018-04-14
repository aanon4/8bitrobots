'use strict';

const native = require('.');

console.info('Loading BeagleBoneBlue GPIO controllers.');

function gpioChannel(gpios, subaddress)
{
  this._gpios = gpios;
  this._subaddress = subaddress;
  this._created = false;
  this._enabled = 0;
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
      native.bbb_gpio_setValue(this._subaddress, value);
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
      return native.bbb_gpio_getValue(this._subaddress);
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
        dir = 0;
      }
      else
      {
        dir = 1;
      }
      native.bbb_gpio_setDir(this._subaddress, dir);
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
      let state = this.get();
      this._timer = setInterval(() =>
      {
        let value = this.get();
        if (value != state)
        {
          state = value;
          this._callbacks.forEach((fn) =>
          {
            fn(value);
          });
        }
      }, 100);
    }
    this._callbacks.push((value) =>
    {
      if (edge == 'both' || (edge == 'rising' && value) || (edge == 'falling' && !value))
      {
        callback(value);
      }
    });
  },

  enable: function()
  {
    if (this._enabled++ === 0)
    {
      if (!this._created)
      {
        this._created = true;
        native.bbb_gpio_create(this._subaddress);
      }
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      clearInterval(this._timer);
      this._callbacks = null;
    }
    return this;
  }
};

function gpios()
{
  this._channels =
  [
    new gpioChannel(this, 0),
    new gpioChannel(this, 1),
    new gpioChannel(this, 2),
    new gpioChannel(this, 3),
    new gpioChannel(this, 4),
    new gpioChannel(this, 5)
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
