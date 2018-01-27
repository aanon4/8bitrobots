console.info('Loading BMP280 Environmental sensors.');

const BME280 =
{
  // Register addresses
  DIG_T1: 0x88, // 16-bit unsigned
  DIG_T2: 0x8A,
  DIG_T4: 0x8C,
  DIG_P1: 0x8E, // 16-bit unsigned
  DIG_P2: 0x90,
  DIG_P3: 0x92,
  DIG_P4: 0x94,
  DIG_P5: 0x96,
  DIG_P6: 0x98,
  DIG_P7: 0x9A,
  DIG_P8: 0x9C,
  DIG_P9: 0x9E,
  
  CTRL_MEAS: 0xF4,
  CONFIG: 0xF5,
  
  PRESSURE: 0xF7, // 3-bytes
  TEMPERATURE: 0xFA, // 3-bytes
};

const TOPIC_TEMPERATURE = { topic: 'temperature' };
const TOPIC_PRESSURE = { topic: 'pressure' };


function twoc(h, l)
{
  var v = (h << 8) + l;
  return v < 0x8000 ? v : -(1 + (v ^ 0xFFFF));
}

function onec(h, l)
{
  return (h << 8) + l;
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
    // Read calibration
    const c0 = this._i2c.writeAndReadBytes(Buffer.from([ BME280.DIG_T1 ]), 26);
    this._dig =
    {
      T1: onec(c0[1], c0[0]),
      T2: twoc(c0[3], c0[2]),
      T3: twoc(c0[5], c0[4]),
      
      P1: onec(c0[7], c0[6]),
      P2: twoc(c0[9], c0[8]),
      P3: twoc(c0[11], c0[10]),
      P4: twoc(c0[13], c0[12]),
      P5: twoc(c0[15], c0[14]),
      P6: twoc(c0[17], c0[16]),
      P7: twoc(c0[19], c0[18]),
      P8: twoc(c0[21], c0[20]),
      P9: twoc(c0[23], c0[22])
    };
    
    // Configure
    this._i2c.writeBytes(Buffer.from([ BME280.CTRL_MEAS, 0x47 ])); // 001 001 11 - 1x oversampling, normal

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
    var data = this._getRawData();
    this._adTemperature.publish(
    {
      C: parseFloat(data.temperatureC.toFixed(2))
    });
    this._adPressure.publish(
    {
      Pa: parseFloat(data.pressurePa.toFixed(2))
    });
  },
  
  _getRawData: function()
  {
    var P;
    var T;
    if (SIMULATOR)
    {
      P = 100000;
      T = 25;
    }
    else
    {
      // Read lots of raw data:
      //  pressure, temperature, humidity
      const data = this._i2c.writeAndReadBytes(Buffer.from([ BME280.PRESSURE ]), 6);
      
      // Calculate temperature
      const adc_T = (data[3] << 12) + (data[4] << 4) + (data[5] >> 4);
      
      var var1 = (adc_T / 16384.0 - this._dig.T1 / 1024.0) * this._dig.T2; 
      var var2 = ((adc_T / 131072.0 - this._dig.T1 / 8192.0) * (adc_T / 131072.0 - this._dig.T1 / 8192.0)) * this._dig.T3; 
      var t_fine = var1 + var2;
      T = (var1 + var2) / 5120.0;
      
      // Calculate pressure
      const adc_P = (data[0] << 12) + (data[1] << 4) + (data[2] >> 4);
      
      var1 = (t_fine / 2.0) - 64000.0;
      var2 = var1 * var1 * this._dig.P6 / 32768.0;
      var2 = var2 + var1 * this._dig.P5 * 2.0;
      var2 = (var2 / 4.0) + (this._dig.P4 * 65536.0);
      var1 = (this._dig.P3 * var1 * var1 / 524288.0 + this._dig.P2 * var1) / 524288.0; 
      var1 = (1.0 + var1 / 32768.0) * this._dig.P1;
      P = 0;
      if (var1 != 0)
      {
        P = 1048576.0 - adc_P;
        P = (P - (var2 / 4096.0)) * 6250.0 / var1;
        var1 = this._dig.P9 * P * P / 2147483648.0;
        var2 = P * this._dig.P8 / 32768.0;
        P = P + (var1 + var2 + this._dig.P7) / 16.0;
      }
    }

    return {
      pressurePa: P,
      temperatureC: T
    };
  }
};

module.exports = sensor;
