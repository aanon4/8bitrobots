console.info('Loading BNO055 I2C/UART IMU sensors.');

const fs = require('fs');
const Deasync = require('deasync');
const SerialPort = require('serialport');

const BNO055 =
{
  // Register addresses
  CHIP_ID: 0x00,
  ACCEL_REV_ID: 0x01,
  MAG_REV_ID: 0x02,
  GYRO_REV_ID: 0x03,
  SW_REV_ID_LSB: 0x04,
  SW_REG_UD_MSB: 0x05,
  BL_REV_ID: 0x06,
  
  PAGE_ID: 0x07,

  ACCEL_DATA_X_LSB: 0x08,
  ACCEL_DATA_X_MSB: 0x09,
  ACCEL_DATA_Y_LSB: 0x0A,
  ACCEL_DATA_Y_MSB: 0x0B,
  ACCEL_DATA_Z_LSB: 0x0C,
  ACCEL_DATA_Z_MSB: 0x0D,
  
  MAG_DATA_X_LSB: 0x0E,
  MAG_DATA_X_MSB: 0x0F,
  MAG_DATA_Y_LSB: 0x10,
  MAG_DATA_Y_MSB: 0x11,
  MAG_DATA_Z_LSB: 0x12,
  MAG_DATA_Z_MSB: 0x13,
  
  GYRO_DATA_X_LSB: 0x14,
  GYRO_DATA_X_MSB: 0x15,
  GYRO_DATA_Y_LSB: 0x16,
  GYRO_DATA_Y_MSB: 0x17,
  GYRO_DATA_Z_LSB: 0x18,
  GYRO_DATA_Z_MSB: 0x19,
  
  EULER_H_LSB: 0x1A,
  EULER_H_MSB: 0x1B,
  EULER_R_LSB: 0x1C,
  EULER_R_MSB: 0x1D,
  EULER_P_LSB: 0x1E,
  EULER_P_MSB: 0x1F,
  
  QUATERNION_DATA_W_LSB: 0x20,
  QUATERNION_DATA_W_MSB: 0x21,
  QUATERNION_DATA_X_LSB: 0x22,
  QUATERNION_DATA_X_MSB: 0x23,
  QUATERNION_DATA_Y_LSB: 0x24,
  QUATERNION_DATA_Y_MSB: 0x25,
  QUATERNION_DATA_Z_LSB: 0x26,
  QUATERNION_DATA_Z_MSB: 0x27,
  
  LINEAR_ACCEL_DATA_X_LSB: 0x28,
  LINEAR_ACCEL_DATA_X_MSB: 0x29,
  LINEAR_ACCEL_DATA_Y_LSB: 0x2A,
  LINEAR_ACCEL_DATA_Y_MSB: 0x2B,
  LINEAR_ACCEL_DATA_Z_LSB: 0x2C,
  LINEAR_ACCEL_DATA_Z_MSB: 0x2D,
  
  GRAVITY_DATA_X_LSB: 0x2E,
  GRAVITY_DATA_X_MSB: 0x2F,
  GRAVITY_DATA_Y_LSB: 0x30,
  GRAVITY_DATA_Y_MSB: 0x31,
  GRAVITY_DATA_Z_LSB: 0x32,
  GRAVITY_DATA_Z_MSB: 0x33,
  
  TEMP: 0x34,
  
  CALIB_STAT: 0x35,
  SELTEST_RESULT: 0x36,
  INTR_STAT: 0x37,
  
  SYS_CLK_STAT: 0x38,
  SYS_STAT: 0x39,
  SYS_ERR: 0x3A,
  
  UNIT_SEL: 0x3B,
  DATA_SELECT: 0x3C,
  
  OPR_MODE: 0x3D,
  PWR_MODE: 0x3E,
  
  SYS_TRIGGER: 0x3F,
  TEMP_SOURCE: 0x40,
  
  AXIS_MAP_CONFIG: 0x41,
  AXIS_MAP_SIGN: 0x42,
  
  SIC_MATRIX_0_LSB: 0x43,
  SIC_MATRIX_0_MSB: 0x44,
  SIC_MATRIX_1_LSB: 0x45,
  SIC_MATRIX_1_MSB: 0x46,
  SIC_MATRIX_2_LSB: 0x47,
  SIC_MATRIX_2_MSB: 0x48,
  SIC_MATRIX_3_LSB: 0x49,
  SIC_MATRIX_3_MSB: 0x4A,
  SIC_MATRIX_4_LSB: 0x4B,
  SIC_MATRIX_4_MSB: 0x4C,
  SIC_MATRIX_5_LSB: 0x4D,
  SIC_MATRIX_5_MSB: 0x4E,
  SIC_MATRIX_6_LSB: 0x4F,
  SIC_MATRIX_6_MSB: 0x50,
  SIC_MATRIX_7_LSB: 0x51,
  SIC_MATRIX_7_MSB: 0x52,
  SIC_MATRIX_8_LSB: 0x53,
  SIC_MATRIX_8_MSB: 0x54,
  
  ACCEL_OFFSET_X_LSB: 0x55,
  ACCEL_OFFSET_X_MSB: 0x56,
  ACCEL_OFFSET_Y_LSB: 0x57,
  ACCEL_OFFSET_Y_MSB: 0x58,
  ACCEL_OFFSET_Z_LSB: 0x59,
  ACCEL_OFFSET_Z_MSB: 0x5A,
  
  MAG_OFFSET_X_LSB: 0x5B,
  MAG_OFFSET_X_MSB: 0x5C,
  MAG_OFFSET_Y_LSB: 0x5D,
  MAG_OFFSET_Y_MSB: 0x5E,
  MAG_OFFSET_Z_LSB: 0x5F,
  MAG_OFFSET_Z_MSB: 0x60,
  
  GYRO_OFFSET_X_LSB: 0x61,
  GYRO_OFFSET_X_MSB: 0x62,
  GYRO_OFFSET_Y_LSB: 0x63,
  GYRO_OFFSET_Y_MSB: 0x64,
  GYRO_OFFSET_Z_LSB: 0x65,
  GYRO_OFFSET_Z_MSB: 0x66,
  
  ACCEL_RADIUS_LSB: 0x67,
  ACCEL_RADIUS_MSB: 0x68,
  MAG_RADIUS_LSB: 0x69,
  MAG_RADIUS_MSB: 0x6A,
  
  // Reset
  RST_SYS: 0x20,
  
  // Power modes
  POWER_MODE_NORMAL: 0x00,
  POWER_MODE_LOW: 0x01,
  POWER_MODE_SUSPENDED: 0x02,
  
  // Operation modes
  OP_MODE_CONFIG: 0x00,
  OP_MODE_ACCONLY: 0x01,
  OP_MODE_MAGONLY: 0x02,
  OP_MODE_GRYOONLY: 0x03,
  OP_MODE_ACCMAG: 0x04,
  OP_MODE_ACCGYRO: 0x05,
  OP_MODE_MAGGYRO: 0x06,
  OP_MODE_AMG: 0x07,
  OP_MODE_IMUPLUS: 0x08,
  OP_MODE_COMPASS: 0x09,
  OP_MODE_M4G: 0x0A,
  OP_MODE_NDOF_FMC_OFF: 0x0B,
  OP_MODE_NDOF: 0x0C,
};

const CALIBRATION_TIMEOUT = 5000; // 5 seconds
const UART_RETRY = 5;
const UART_TIMEOUT = 1000;

const TOPIC_ORIENTATION = { topic: 'orientation', schema: { confidence: 'Number', x: 'Number', y: 'Number', z: 'Number', w: 'Number' } };
const TOPIC_ACCELERATION = { topic: 'acceleration', schema: { confidence: 'Number', linearaccel: { x: 'Number', y: 'Number', z: 'Number' } } };
const TOPIC_CALIBRATION = { topic: 'calibration', schema: { confidence: 'Number', old: 'Hash', new: 'Hash' } };
const TOPIC_TEMPERATURE = { topic: 'temperature', schema: { 'C': 'Number' } };


function twoc(a, b)
{
  let v = a + (b << 8);
  return v < 0x8000 ? v : -(1 + (v ^ 0xFFFF));
}


function imu(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._uart = config.uart;
  this._axisRemap = config.remap || null;
  this._clockBit = config.extClock ? 0x80 : 0x00;
  this._forcereset = config.reset || false;

  if (SIMULATOR)
  {
    this._forcereset = false;
    this._readBytes = this._readBytesSim;
    this._writeBytes = this._writeBytesSim;
  }
  else if (config.i2c)
  {
    this._i2c = config.i2c;
    this._readBytes = this._readBytesI2C;
    this._writeBytes = this._writeBytesI2C;
  }
  else if (config.uart)
  {
    this._uart = new SerialPort(config.uart.port,
    {
      baudRate: config.uart.baud
    });
    this._uartBuffer = [];
    this._uart.on('data', (data) =>
    {
      this._incomingBytesUart(data);
    });
    this._readBytes = this._readBytesUart;
    this._writeBytes = this._writeBytesUart;
    Deasync.loopWhile(() =>
    {
      return !this._uart.isOpen();
    });
  }
  else
  {
    throw new Error('Must define i2c or uart');
  }

  // Setup ...
  this._confidence = 0;
  this._calibration =
  {
    sys: 0,
    gyr: 0,
    acc: 0,
    mag: 0
  };
  
  this._lostcalibration = Date.now();
  try
  {
    this._calibrationData = JSON.parse(fs.readFileSync('./saved/imu-calibration-data' + this._name.replace(/\//g, '-') + '.json'));
  }
  catch (_)
  {
    this._calibrationData = null;
  }
}

imu.X_AXIS = 1;
imu.Y_AXIS = 2;
imu.Z_AXIS = 3;

imu.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      // Reset the device, reloading any saved calibration data
      this._reset(this._forcereset);

      this._adOrientation = this._node.advertise(TOPIC_ORIENTATION);
      this._adAcceleration = this._node.advertise(TOPIC_ACCELERATION);
      this._adCalibration = this._node.advertise(TOPIC_CALIBRATION);
      this._adTemperature = this._node.advertise(TOPIC_TEMPERATURE);
  
      this._clock1 = setInterval(() => {
        this._updateQuaternionAndLinear();
      }, 20);
      this._clock2 = setInterval(() => {
        this._updateCalibrationStatus();
        this._updateTemp();
      }, 1000);
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      clearInterval(this._clock1);
      clearInterval(this._clock2);

      this._node.unadvertise(TOPIC_ORIENTATION);
      this._node.unadvertise(TOPIC_ACCELERATION);
      this._node.unadvertise(TOPIC_CALIBRATION);
      this._node.unadvertise(TOPIC_TEMPERATURE);
    }
    return this;
  },

  _readBytesI2C: function(address, readLen)
  {
    return Array.prototype.slice.call(this._i2c.writeAndReadBytes(Buffer.from([ address ]), readLen), 0);
  },

  _writeBytesI2C: function(address, bytes)
  {
    return this._i2c.writeBytes(Buffer.from([ address ].concat(bytes)));
  },

  _readBytesUart: function(address, readLen)
  {
    let req = [ 0xAA, 0x01, address, readLen ];
    for (var r = 0; r < UART_RETRY; r++)
    {
      this._writeUart(req);
      let response = this._readUart();
      let lengthOrStatus = this._readUart();
      if (response == 0xBB)
      {
        let data = new Array(lengthOrStatus);
        for (var i = 0; i < lengthOrStatus; i++)
        {
          data[i] = this._readUart();
        }
        return data;
      }
    }
    throw new Error();
  },

  _writeBytesUart: function(address, bytes)
  {
    let data = [ 0xAA, 0x00, address, bytes.length ].concat(bytes);
    for (var r = 0; r < UART_RETRY; r++)
    {
      this._writeUart(data);
      let response = this._readUart();
      if (address == BNO055.SYS_TRIGGER)
      {
        if (response == 0xEE)
        {
          return;
        }
      }
      else
      {
        let status = this._readUart();
        if (response == 0xEE && status == 0x01)
        {
          return;
        }
      }
    }
    throw new Error();
  },

  _writeUart: function(bytes)
  {
    //console.log('write', Buffer.from(bytes));
    this._uart.write(Buffer.from(bytes));
  },

  _readUart: function()
  {
    //console.log('read');
    if (this._uartBuffer.length == 0)
    {
      let timeout = Date.now() + UART_TIMEOUT;
      Deasync.loopWhile(() =>
      {
        return this._uartBuffer.length == 0 && Date.now() < timeout;
      });
      if (Date.now() >= timeout)
      {
        throw new Error();
      }
    }
    let v = this._uartBuffer.shift();
    //console.log(v);
    return v;
  },

  _readBytesSim(address, readLen)
  {
    switch (address)
    {
      case BNO055.QUATERNION_DATA_W_LSB:
        return [ 128, 128, 128, 128, 128, 128, 128, 128 ];

      case BNO055.CALIB_STAT:
        return [ 255 ];

      default:
        return new Array(readLen);
    }
  },

  _writeBytesSim(address, bytes)
  {
  },

  _incomingBytesUart: function(data)
  {
    //console.log('incoming', data);
    for (var i = 0; i < data.length; i++) {
      this._uartBuffer.push(data[i]);
    }
  },
  
  _updateQuaternionAndLinear: function()
  {
    // Read the heading, roll, and pitch data.
    var data;
    try
    {
      data = this._readBytes(BNO055.QUATERNION_DATA_W_LSB, 8);
      // We occasionally get all zero's - ditch these samples
      this._checkZero(data);
    }
    catch (_)
    {
      // Ignore errors
      return;
    }

    this._adOrientation.publish(
    {
      confidence: this._confidence,
      w: twoc(data[0], data[1]) / 16384.0,
      x: -twoc(data[2], data[3]) / 16384.0,
      y: -twoc(data[4], data[5]) / 16384.0,
      z: -twoc(data[6], data[7]) / 16384.0
    });
    
    try
    {
      data  = this._readBytes(BNO055.LINEAR_ACCEL_DATA_X_LSB, 6);
      // We occasionally get all zero's - ditch these samples
      this._checkZero(data);
    }
    catch (_)
    {
      // Ignore errors
      return;
    }

    this._adAcceleration.publish(
    {
      confidence: this._confidence,
      linearaccel:
      {
        x: twoc(data[0], data[1]) / 100.0,
        y: twoc(data[2], data[3]) / 100.0,
        z: twoc(data[4], data[5]) / 100.0 
      }
    });
  },
  
  _updateCalibrationStatus: function()
  {
    var status;
    try
    {
      status = this._readBytes(BNO055.CALIB_STAT, 1)[0];
    }
    catch (_)
    {
      // Ignore errors
      return;
    }

    let old =
    {
      mag: this._calibration.mag,
      acc: this._calibration.acc,
      gyr: this._calibration.gyr,
      sys: this._calibration.sys
    };
    
    this._calibration.mag = (status & 0x03);
    this._calibration.acc = (status & 0x0C) >> 2;
    this._calibration.gyr = (status & 0x30) >> 4;
    this._calibration.sys = (status & 0xC0) >> 6;
    //console.log(this._calibration);

    this._confidence = this._calibration.sys + 1;
    var diff = false;
    for (var s in this._calibration)
    {
      if (this._calibration[s] !== old[s])
      {
        diff = true;
      }
    }
    
    if (diff)
    {
      this._adCalibration.publish(
      {
        old: old,
        new: this._calibration,
        confidence: this._confidence
      });
      
      // Once we're fully calibrated, save the calibration data so we can reuse it
      if (this._calibration.sys === 3)
      {
        this._saveCalibrationData();
      }
      if (this._calibrationData)
      {
        if (this._confidence === 0)
        {
          if (this._lostcalibration === null)
          {
            this._lostcalibration = Date.now();
          }
          if (Date.now() - this._lostcalibration > CALIBRATION_TIMEOUT)
          {
            console.warn(this._name + ': restarting');
            this._reset(this._forcereset);
            this._lostcalibration = null;
          }
        }
        else
        {
          this._lostcalibration = null;
        }
      }
    }
  },
  
  _updateTemp: function()
  {
    const temp = this._readBytes(BNO055.TEMP, 1);
 
    this._adTemperature.publish(
    {
      C: temp[0]
    });
  },
  
  _saveCalibrationData: function()
  {
    let calibrationData =
    {
      accel:
      {
        offset: [],
        radius: []
      },
      mag:
      {
        offset: [],
        radius: []
      },
      gyro:
      {
        offset: []
      }
    };
    
    try
    {
      this._writeBytes(BNO055.OPR_MODE, [ BNO055.OP_MODE_CONFIG ]);
      this._delay(50);
      
      calibrationData.accel.offset = this._readBytes(BNO055.ACCEL_OFFSET_X_LSB, 6);
      calibrationData.mag.offset = this._readBytes(BNO055.MAG_OFFSET_X_LSB, 6);
      calibrationData.gyro.offset = this._readBytes(BNO055.GYRO_OFFSET_X_LSB, 6);
      calibrationData.accel.radius = this._readBytes(BNO055.ACCEL_RADIUS_LSB, 2);
      calibrationData.mag.radius = this._readBytes(BNO055.MAG_RADIUS_LSB , 2);
      
      this._writeBytes(BNO055.OPR_MODE, [ BNO055.OP_MODE_NDOF ]);
      this._delay(50);
      
      fs.writeFileSync('./saved/imu-calibration-data' + this._name.replace(/\//g, '-') + '.json', JSON.stringify(calibrationData));
      this._calibrationData = calibrationData;
    }
    catch (_)
    {
      // Ignore i2c errors
    }
  },
  
  _loadCalibrationData: function()
  {
    this._writeBytes(BNO055.OPR_MODE, [ BNO055.OP_MODE_CONFIG ]);
    this._delay(50);
  
    try
    {
      let calibrationData = this._calibrationData;
      this._writeBytes(BNO055.ACCEL_OFFSET_X_LSB, calibrationData.accel.offset);
      this._writeBytes(BNO055.MAG_OFFSET_X_LSB, calibrationData.mag.offset);
      this._writeBytes(BNO055.GYRO_OFFSET_X_LSB, calibrationData.gyro.offset);
      this._writeBytes(BNO055.ACCEL_RADIUS_LSB, calibrationData.accel.radius);
      this._writeBytes(BNO055.MAG_RADIUS_LSB, calibrationData.mag.radius);
      this._lostcalibration = null;
    }
    catch (_)
    {
    }
    
    this._writeBytes(BNO055.OPR_MODE, [ BNO055.OP_MODE_NDOF ]);
    this._delay(50);
  },

  _reset: function(force)
  {
    // We forceably reset the IMU if we *really* want to, or if we have no calibration data for it.
    if (force || !this._calibrationData)
    {
      // Reset - we do this to make sure the chip comes up correctly each time (in case of dirty power-on-reset)
      try
      {
        this._writeBytes(BNO055.SYS_TRIGGER, [ BNO055.RST_SYS | this._clockBit]);
      }
      catch (_)
      {
        console.error('Reset failed');
      }

      // Wait for the device to be ready
      this._delay(1000); // Should take 650ms reset-to-normal mode .. but sometimes (waaay) longer
      var error = true;
      for (var count = 1; count < 60; count++)
      {
        try
        {
          var id = this._readBytes(BNO055.CHIP_ID, 1);
          if (id[0] === 0xA0 || SIMULATOR)
          {
            error = false;
            break;
          }
        }
        catch (_)
        {
        }
        this._delay(1000);
        console.log(`...Retry ${count}`);
      }
      if (error)
      {
        throw new Error('Failed to start BNO055: ' + this._name);
      }
    }

    // Normal power mode
    this._writeBytes(BNO055.PWR_MODE, [ BNO055.POWER_MODE_NORMAL ]);
  
    // Set page 0 - which is where all the useful register are
    this._writeBytes(BNO055.PAGE_ID, [ 0x00 ]);

    // Unit selection - celcius, radians, dps, m/s^2
    this._writeBytes(BNO055.UNIT_SEL, [ 0x04 ]);
  
    // Remap any axes we need to
    if (this._axisRemap)
    {
      var map = 0;
      var sign = 0;
      if (this._axisRemap.x > 0)
      {
        map |= (this._axisRemap.x - imu.X_AXIS);
      }
      else if (this._axisRemap.x < 0)
      {
        map |= (-this._axisRemap.x - imu.X_AXIS);
        sign |= 4;
      }
      if (this._axisRemap.y > 0)
      {
        map |= (this._axisRemap.y - imu.X_AXIS) << 2;
      }
      else if (this._axisRemap.y < 0)
      {
        map |= (-this._axisRemap.y - imu.X_AXIS) << 2;
        sign |= 2;
      }
      if (this._axisRemap.z > 0)
      {
        map |= (this._axisRemap.z - imu.X_AXIS) << 4;
      }
      else if (this._axisRemap.z < 0)
      {
        map |= (-this._axisRemap.z - imu.X_AXIS) << 4;
        sign |= 1;
      }
      this._writeBytes(BNO055.AXIS_MAP_CONFIG, [ map ]);
      this._writeBytes(BNO055.AXIS_MAP_SIGN, [ sign ]);
    }
  
    // Apply any saved calibration data we may have
    // This will also put the IMU into the correct mode at the end regardless of whether
    // there is any saved calibration data.
    this._loadCalibrationData();
  },
  
  _delay: function(ms)
  {
    let finish = Date.now() + ms;
    while (Date.now() < finish)
      ;
  },

  _checkZero: function(buf)
  {
    for (var i = buf.length - 1; i >= 0; i--)
    {
      if (buf[i])
      {
        return;
      }
    }
    throw new Error('buffer all zeros');
  }
};

module.exports = imu;
