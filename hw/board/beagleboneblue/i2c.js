'use strict';

console.info('Loading BeagleBoneBlue I2C controllers.');

function i2c(bus, address)
{
  this._bus = bus;
  this._address = address;
}

i2c.prototype =
{
  address: function()
  {
    return this._address;
  },
  
  id: function()
  {
    return `${this._bus.id()}/${this._address}`;
  },

  valid: function()
  {
    try
    {
      let buffer = Buffer.alloc(0);
      this._bus.i2cWriteSync(this._address, buffer.length, buffer);
      return true;
    }
    catch (_)
    {
      return false;
    }
  },

  writeBytes: function(buffer)
  {
    this._bus.i2cWriteSync(this._address, buffer.length, buffer);

  },

  readBytes: function(nrBytes)
  {
    let buffer = Buffer.alloc(nrBytes);
    let nr = this._bus.i2cReadSync(this._address, buffer.length, buffer);
    return buffer.length === nr ? buffer : buffer.slice(0, nr);
  },
  
  writeAndReadBytes: function(bytesToWrite, nrBytesToRead)
  {
    this._bus.i2cWriteSync(this._address, bytesToWrite.length, bytesToWrite);
    let buffer = Buffer.alloc(nrBytesToRead);
    let nr = this._bus.i2cReadSync(this._address, buffer.length, buffer);
    return buffer.length === nr ? buffer : buffer.slice(0, nr);
  }
};

function I2CBus(config)
{
  if (!SIMULATOR)
  {
    this._native = require('i2c-bus').openSync(config.bus);
  }
  else
  {
    // Testing mock
    this._native =
    {
      i2cWriteSync: function(addr, len, buf)
      {
        return len;
      },

      i2cReadSync: function(addr, len, buf)
      {
        return len;
      }
    }
  }
  this._bus = config.bus;
};

I2CBus.prototype =
{
  open: function(config)
  {
    return new i2c(this, config.address);
  },

  id: function()
  {
    return `${this._bus}`;
  },

  i2cWriteSync: function(addr, len, buf)
  {
    return this._native.i2cWriteSync(addr, len, buf);
  },

  i2cReadSync: function(addr, len, buf)
  {
    return this._native.i2cReadSync(addr, len, buf);
  }
}

module.exports =
{
  open: function(config)
  {
    return new I2CBus(config);
  }
}
