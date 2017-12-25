const fs = require('fs');

function execute(ctx, fn)
{
  try
  {
    var r = fn.call(ctx);
    return r;
  }
  catch (e)
  {
    console.error(e);
    throw e;
  }
}


function i2c(address)
{
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
    return this._busId + '/' + this._address;
  },

  valid: function()
  {
    try
    {
      return execute(this, function()
      {
        var buffer = Buffer.alloc(1);
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
      this._i2cBus.i2cWriteSync(this._address, buffer.length, buffer);
    });
  },

  readBytes: function(nrBytes)
  {
    return execute(this, function()
    {
      var buffer = Buffer.alloc(nrBytes);
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
      this._i2cBus.i2cWriteSync(this._address, buffer.length, buffer);
      buffer = Buffer.alloc(nrBytesToRead);
      var nr = this._i2cBus.i2cReadSync(this._address, buffer.length, buffer);
      var data = Array(nr);
      for (var i = 0; i < nr; i++)
      {
        data[i] = buffer[i];
      }
      return data;
    });
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
