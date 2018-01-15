console.info('Loading RaspberryPi I2C controllers.');

const fs = require('fs');
const native = require('.');

function execute(ctx, fn)
{
  try
  {
    native.i2clock_lock(1);
    var r = fn.call(ctx);
    native.i2clock_lock(0);
    return r;
  }
  catch (e)
  {
    native.i2clock_lock(0);
    console.error(e);
    throw e;
  }
}


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
      return execute(this, function()
      {
        let buffer = Buffer.alloc(0);
        this._bus.i2cWriteSync(this._address, buffer.length, buffer);
        return true;
      });
    }
    catch (_)
    {
      return false;
    }
  },

  writeBytes: function(buffer)
  {
    return execute(this, function()
    {
      this._bus.i2cWriteSync(this._address, buffer.length, buffer);
    });
  },

  readBytes: function(nrBytes)
  {
    return execute(this, function()
    {
      let buffer = Buffer.alloc(nrBytes);
      let nr = this._bus.i2cReadSync(this._address, buffer.length, buffer);
      return buffer.length === nr ? buffer : buffer.slice(0, nr);
    });
  },
  
  writeAndReadBytes: function(bytesToWrite, nrBytesToRead)
  {
    return execute(this, function()
    {
      this._bus.i2cWriteSync(this._address, bytesToWrite.length, bytesToWrite);
      let buffer = Buffer.alloc(nrBytesToRead);
      let nr = this._bus.i2cReadSync(this._address, buffer.length, buffer);
      return buffer.length === nr ? buffer : buffer.slice(0, nr);
    });
  },
  
  
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
  this._swtch = null;
  this._channel = config.channel || null;
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
    if (this._swtch)
    {
      return `${this._bus}/${this._channel}`;
    }
    else
    {
      return `${this._bus}`;
    }
  },

  i2cWriteSync: function(addr, len, buf)
  {
    this._select();
    return this._native.i2cWriteSync(addr, len, buf);
  },

  i2cReadSync: function(addr, len, buf)
  {
    this._select();
    return this._native.i2cReadSync(addr, len, buf);
  },

  _select: function()
  {
    if (this._swtch && this._channel !== null)
    {
      this._swtch.setChannel(this._channel);
    }
  },

  addSwitch: function (swtch)
  {
    this._swtch = swtch;
    return swtch;
  }
}

module.exports =
{
  open: function(config)
  {
    return new I2CBus(config);
  }
}
