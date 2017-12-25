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

var _swtch = null;


function i2c(address, channel)
{
  this._address = address;
  this._channel = channel === undefined ? null : channel;
}

i2c.prototype =
{
  address: function()
  {
    return this._address;
  },
  
  channel: function()
  {
    return this._channel;
  },
  
  id: function()
  {
    return this._busId + '/' + this._channel + '/' + this._address;
  },

  valid: function()
  {
    try
    {
      return execute(this, function()
      {
        var buffer = Buffer.alloc(0);
        this._select();
        this._i2cBus.i2cWriteSync(this._address, buffer.length, buffer);
        return true;
      });
    }
    catch (_)
    {
      return false;
    }
  },

  writeBytes: function(byteArray)
  {
    return execute(this, function()
    {
      var buffer = Buffer.alloc(byteArray);
      this._select();
      this._i2cBus.i2cWriteSync(this._address, buffer.length, buffer);
    });
  },

  readBytes: function(nrBytes)
  {
    return execute(this, function()
    {
      var buffer = Buffer.alloc(nrBytes);
      this._select();
      var nr = this._i2cBus.i2cReadSync(this._address, buffer.length, buffer);
      var data = Array(nr);
      for (var i = 0; i < nr; i++)
      {
        data[i] = buffer[i];
      }
      return data;
    });
  },
  
  writeAndReadBytes: function(bytesToWrite, nrBytesToRead)
  {
    return execute(this, function()
    {
      var buffer = Buffer.alloc(bytesToWrite);
      this._select();
      this._i2cBus.i2cWriteSync(this._address, buffer.length, buffer);
      buffer = Buffer.alloc(nrBytesToRead);
      this._select();
      var nr = this._i2cBus.i2cReadSync(this._address, buffer.length, buffer);
      var data = Array(nr);
      for (var i = 0; i < nr; i++)
      {
        data[i] = buffer[i];
      }
      return data;
    });
  },
  
  _select: function()
  {
    if (_swtch && this._channel !== null)
    {
      _swtch.setChannel(this._channel);
    }
  },

  addSwitch: function (swtch) {
    _swtch = swtch;
    return swtch;
  }
};

module.exports =
{
  open: function(config)
  {
    var i2cBus;
    if (!SIMULATOR)
    {
      i2cBus = require('i2c-bus').openSync(config.bus);
    }
    else
    {
      // Testing mock
      i2cBus =
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
    function bus()
    {
      this._busId = config.bus;
      this._i2cBus = i2cBus;
      i2c.apply(this, arguments);
    }
    bus.prototype = i2c.prototype;
    return bus;
  }
};
