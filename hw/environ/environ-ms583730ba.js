console.info('Loading MS5837-30BA pressure/temperature sensors.');

const TOPIC_TEMPERATURE = { topic: 'temperature' };
const TOPIC_PRESSURE = { topic: 'pressure' };


function twoc(h, l)
{
  var v = (h << 8) + l;
  return v < 0x8000 ? v : -(1 + (v ^ 0xFFFF));
}


function sensor(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  this._i2c = config.i2c;
}

sensor.prototype =
{
  enable: function()
  {
    this._i2c.writeBytes([ 0x1E ]); // Reset
    this._delay(10);

    // Read calibration
    this._c = [];
    for (var i = 0; i < 7; i++)
    {
      var data = this._i2c.writeAndReadBytes([ 0xA0 + i * 2 ], 2);
      this._c[i] = (data[0] << 8) | data[1];
    }
  
    this._adTemperature = this._node.advertise(TOPIC_TEMPERATURE);
    this._adPressure = this._node.advertise(TOPIC_PRESSURE);
    this._clock = setInterval(() => {
      this._process();
    }, 1000);
    return this;
  },

  disable: function()
  {
    clearInterval(this._clock);
    this._node.unadvertise(TOPIC_TEMPERATURE);
    this._node.unadvertise(TOPIC_PRESSURE);
    return this;
  },

  _process: function()
  { 
    // Read pressure (D1) and temp (D2)
    this._i2c.writeBytes([ 0x4A ]);
    setTimeout(() =>
    {
      var data = this._i2c.writeAndReadBytes([ 0x00 ], 3);
      const D1 = (data[0] << 16) | (data[1] << 8) | data[2];
      this._i2c.writeBytes([ 0x5A ]);
      setTimeout(() =>
      {
        var data = this._i2c.writeAndReadBytes([ 0x00 ], 3);
        const D2 = (data[0] << 16) | (data[1] << 8) | data[2];
        
        const C = this._c;
        
        const dT = D2 - C[5] * 256;
        const SENS = C[1] * 32768 + C[3] * dT / 256;
        const OFF = C[2] * 65536 + C[4] * dT / 128;
        
        var TEMP = 2000 + dT * C[6] / 8388608;
        var P = (D1 * SENS / 2097152 - OFF) / 8192;
        
        var Ti;
        var OFFi;
        var SENSi;
        if (TEMP / 100 < 20)
        {
          Ti = 3 * dT * dT / 8589934592;
          var TEMP2 = TEMP - 2000;
          TEMP2 = TEMP2 * TEMP2;
          OFFi = 3 * TEMP2 / 2;
          SENSi = 5 * TEMP2 / 8;
          if (TEMP / 100 < -15)
          {
            var TEMP3 = TEMP + 1500;
            TEMP3 = TEMP3 * TEMP3;
            OFFi += 7 * TEMP3;
            SENSi += 4 * TEMP3;
          }
        }
        else
        {
          Ti = 2 * dT * dT / 137438953472;
          var TEMP4 = TEMP - 2000;
          OFFi = TEMP4 * TEMP4 / 16;
          SENSi = 0;
        }
        
        TEMP -= Ti;
        P = (D1 * (SENS - SENSi) / 2097152 - (OFF - OFFi)) / 8192;

        this._adTemperature.publish(
        {
          C: parseFloat((TEMP / 100).toFixed(2))
        });
        
        this._adPressure.publish(
        {
          Pa: parseFloat((P * 10).toFixed(2))
        });
        
      }, 20);
    }, 20);
  },
  
  _delay: function(ms)
  {
    const finish = Date.now() + ms;
    while (Date.now() < finish)
      ;
  }
};

module.exports = sensor;
