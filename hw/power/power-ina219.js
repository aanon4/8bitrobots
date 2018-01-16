console.info('Loading INA219 power monitors.');

const INA219 =
{
  // Registers
  CONFIG: 0x00,
  SHUNT_VOLTAGE: 0x01,
  BUS_VOLTAGE: 0x02,
  POWER: 0x03,
  CURRENT: 0x04,
  CALIBRATION: 0x05
};

const TOPIC_STATUS = { topic: 'status' };

function twoc(v)
{
  return v < 0x8000 ? v : -(1 + (v ^ 0xFFFF));
}


function power(config)
{
  this._name = config.name;
  this._i2c = config.i2c;
  this._node = rosNode.init(config.name);
  
  // Setup ...
  
  //const max_v = 16.0;
  const shunt_v = 0.24;
  const shunt_r = 0.03;
  const max_i = shunt_v / shunt_r;
  const min_lsb = max_i / 32768;
  //const max_lsb = max_i / 4096;
  const curr_lsb = min_lsb;
  this._calibration = (0.04096 / (curr_lsb * shunt_r)) | 0;
  this._currentScale = 0.04096 / (this._calibration * shunt_r);
  //const power_lsb = 20 * curr_lsb;
  //var max_curr = curr_lsb * 32768;
  //if (max_curr > max_i)
  //{
  //  max_curr = max_i;
  //}
  //var max_shunt_v = max_curr * shunt_r;
  //if (max_shunt_v > max_v)
  //{
  //  max_shunt_v = max_v;
  //}
  //const max_power = max_curr * max_v;
}

power.prototype =
{
  enable: function()
  {
    // Calibration
    this._i2c.writeBytes([ INA219.CALIBRATION, (this._calibration >> 8) & 0xFF, this._calibration & 0xFF ]);
  
    // Set bus voltage (16V), gain, bus adc range, shunt adc range and
    //  continuous mode
    this._i2c.writeBytes([ INA219.CONFIG,
      // 16V  | 8 gain | 12-bit BADC | 12-bit 1s SADC | S&B continuous
         0x00 | 0x18   | 0x04        | 0x00           | 0x00,
         0x00 | 0x00   | 0x00        | 0x18           | 0x07
    ]);

    this._ad = this._node.advertise(TOPIC_STATUS);
    this._clock = setInterval(() => {
      this._process();
    }, 100);
    return this;
  },
  
  disable: function()
  {
    clearInterval(this._clock);
    this._node.unadvertise(TOPIC_STATUS);
    return this;
  },
  
  _process: function()
  {
    try
    {
      var v;
      var a;
      if (!SIMULATOR)
      {
        let rawv = this._i2c.writeAndReadBytes([ INA219.BUS_VOLTAGE ], 2);
        let rawa = this._i2c.writeAndReadBytes([ INA219.CURRENT ], 2);
        
        v = twoc((((rawv[0] << 8) + rawv[1]) >> 3) << 2) / 1000.0
        a = twoc((rawa[0] << 8) + rawa[1]) * this._currentScale;
      }
      else
      {
        v = 12.0;
        a = 1.0;
      }
      
      this._ad.publish(
      {
        v: parseFloat(v.toFixed(2)),
        a: parseFloat(a.toFixed(2)),
        w: parseFloat((v * a).toFixed(2))
      });
    }
    catch (e)
    {
      console.error(e.stack);
    }
  }
};

module.exports = power;
