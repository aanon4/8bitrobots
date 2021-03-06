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

  write: function(buffer)
  {
    const buf = Buffer.from(buffer);
    return new Promise((resolve) => {
      this._select();
      this._spi.transfer(buf, () => {
        this._unselect();
        resolve();
      });
    })
  },

  transfer: function(txbuf, rxbuf)
  {
    const buf = Buffer.alloc(Math.max(rxbuf.length, txbuf.length));
    txbuf.copy(buf);
    return new Promise((resolve) => {
      this._select();
      this._spi.transfer(buf, (nbuf) => {
        this._unselect();
        nbuf.copy(rxbuf);
        resolve(rxbuf);
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
  if (!SIMULATOR)
  {
    const SPI = require('spi');
    const channel = config.channel;

    if (!'mode' in config || !'speed' in config)
    {
      throw new Error('Must defined SPI mode and speed');
    }
    this._spi = new SPI.Spi(`/dev/spidev${channel}.${channel}`,
    {
      mode: config.mode,
      maxSpeed: config.speed
    }, (spi) => {
      spi.open();
    });
   
    this._bus = 
    {
      _name: `spi${channel}`,
      _spi: this._spi,

      transfer: function(buffer, callback)
      {
        this._spi.transfer(buffer, buffer, () => {
          callback(buffer);
        });
      }
    };
  }
  else
  {
    this._bus = 
    {
      transfer: function(buffer, callback)
      {
        callback(buffer);
      }
    };
  }
}

spi.prototype =
{
  open: function(config)
  {
    return new spiDev(this._bus, config && config.select);
  }
};

module.exports =
{
  open: function(config)
  {
    return new spi(config);
  }
};
