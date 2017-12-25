console.info('Loading RaspberryPi SPI controllers.');

function spi(bus, pin)
{
  this._spi = bus;
  this._pin = pin;
  if (pin.pin === 'none' || SIMULATOR)
  {
    this._gpio =
    {
      set: function()
      {
      }
    };
  }
  else
  {
    const GPIO = require('gpio');
    this._gpio = GPIO.export(pin.pin,
    {
      direction: 'out'
    });
  }
  this._gpioLevel = pin.level ? 1 : 0;
}

spi.prototype =
{
  id: function()
  {
    if (this._pin.pin === 'none')
    {
      return this._spi._name;
    }
    else
    {
      return `${this._spi._name}/${this._pin.pin}`;
    }
  },

  valid: function()
  {
    return true;
  },

  read: function(buffer)
  {
    return new Promise((resolve) => {
      this._select();
      this._spi.read(buffer, () => {
        this._unselect();
        resolve(buffer);
      });
    });
  },

  write: function(buffer)
  {
    return new Promise((resolve) => {
      this._select();
      this._spi.write(buffer, () => {
        this._unselect();
        resolve(buffer);
      });
    })
  },

  transfer: function(txbuf, rxbuf)
  {
    return new Promise((resolve) => {
      this._select();
      this._spi.transfer(txbuf, rxbuf, () => {
        this._unselect();
        resolve(txbuf);
      });
    });
  },

  _select: function()
  {
    this._gpio.set(this._gpioLevel);
  },

  _unselect: function()
  {
    this._gpio.set(1 - this._gpioLevel);
  }
};

module.exports =
{
  _buses: {},

  open: function(config)
  {
    let bus = _buses[config.bus];
    if (!bus)
    {
      if (!SIMULATOR)
      {
        const SPI = require('spi');
        bus = new SPI.Spi(config.bus);
        config.mode && bus.mode(SPI.MODE[config.mode]);
        config.size && bus.size(config.size);
        config.bitOrder && bus.bitOrder(SPI.ORDER[config.bitOrder]);
        config.maxSpeed && bus.maxSpeed(config.maxSpeed);
        if (typeof config.chipSelect === 'string')
        {
          bus.chipSelect(SPI.CS[config.chipSelect]);
        }
        bus.open();
        bus._name = config.bus;
        bus._devices = {};
      }
      else
      {
        bus = 
        {
          _devices: {},

          read: function (buffer, callback)
          {
            callback();
          },

          write: function (buffer, callback)
          {
            callback();
          },

          transfer: function(txbuf, rxbuf, callback)
          {
            callback();
          }
        };
      }
      this._buses[config.bus] = bus;
    }
    let pin = config.chipSelect
    if (typeof pin !== 'object')
    {
      pin = { pin: 'none' };
    }
    let dev = bus._devices[pin.pin];
    if (!dev)
    {
      dev = new spi(bus, pin);
      bus._devices[pin.pin] = dev;
    }
    return dev;
  }
};
