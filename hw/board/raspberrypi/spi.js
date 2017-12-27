console.info('Loading RaspberryPi SPI controllers.');

function spiDev(bus, select)
{
  this._spi = bus;
  if (select)
  {
    this._gpio = select.pin;
    this._gpio.enable();
    this._gpio.dir('output');
    this._gpioLevel = select.level ? 1 : 0;
    this._unselect();
  }
}

spiDev.prototype =
{
  id: function()
  {
    if (this._gpio)
    {
      return `${this._spi._name}/${this._gpio.id()}`;
    }
    else
    {
      return this._spi._name;
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
    this._gpio && this._gpio.set(this._gpioLevel);
  },

  _unselect: function()
  {
    this._gpio && this._gpio.set(1 - this._gpioLevel);
  }
};

function spi(config)
{
  let bus;
  if (!SIMULATOR)
  {
    const SPI = require('spi');
    bus = new SPI.Spi(config.bus);
    config.mode && bus.mode(SPI.MODE[config.mode]);
    config.bitsPerWord && bus.bitsPerWord(config.size);
    config.bitOrder && bus.bitOrder(SPI.ORDER[config.bitOrder]);
    config.maxSpeed && bus.maxSpeed(config.maxSpeed);
    config.select && bus.chipSelect(SPI.CS[config.select]);
    bus.open();
    bus._name = config.bus;
    this._bus = bus;
  }
  else
  {
    this._bus = 
    {
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
}

spi.prototype =
{
  open: function(config)
  {
    config = config || {};
    return new spiDev(this._bus, config.select);
  }
};

module.exports = spi;
