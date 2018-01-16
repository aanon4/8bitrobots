'use strict';

// Based on Adruino implementation: https://github.com/kriswiner/MPU9250

console.info('Loading MPU9250 IMU sensors.');

const fs = require('fs');

const MPU9250 =
{
  XG_OFFSET_H:   0x13,
  XG_OFFSET_L:   0x14,
  YG_OFFSET_H:   0x15,
  YG_OFFSET_L:   0x16,
  ZG_OFFSET_H:   0x17,
  ZG_OFFSET_L:   0x18,
  SMPLRT_DIV:    0x19,
  CONFIG:        0x1A,
  GYRO_CONFIG:   0x1B,
  ACCEL_CONFIG:  0x1C,
  ACCEL_CONFIG2: 0x1D,
  FIFO_EN:       0x23,
  I2C_MST_CTRL:  0x24,
  INT_PIN_CFG:   0x37,
  INT_ENABLE:    0x38,
  ACCEL_XOUT_H:  0x3B,
  USER_CTRL:     0x6A,
  PWR_MGMT_1:    0x6B,
  PWR_MGMT_2:    0x6C,
  FIFO_COUNTH:   0x72,
  FIFO_R_W:      0x74,
};

const AK8963 =
{
  WHOAMI: 0x00,
  ST1:    0x02,
  XOUT_L: 0x03,
  CNTL:   0x0A,
  ASAX:   0x10,
};

const ASCALE = 0; // AFS_2G
const ARES   = 2 / 32768; //
const GSCALE = 0; // GFS_250DPS
const GRES   = 250 / 32768; //
const MSCALE = 1; // MFS_16BITS
const MRES = 10 * 4912 / 32760; //
const MMODE = 6; // 100hz continuous magnometer data

const GYRO_MEASURE_ERROR = Math.PI * (60 / 180);
const BETA = Math.sqrt(3 / 4) * GYRO_MEASURE_ERROR;

const TOPIC_ORIENTATION = { topic: 'orientation' };
const TOPIC_CALIBRATION = { topic: 'calibration' };


function imu(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  this._i2cMPU9250 = config.i2c.MPU9250;
  this._i2cAK8963 = config.i2c.AK8963;
  this._clock = null;
  this._reset = config.reset;

  this._q = [ 1, 0, 0, 0 ];

  this._accelBias = [ 0, 0, 0 ];
  this._gyroBias = [ 0, 0, 0 ];
  this._magBias = [ 0, 0, 0 ];
  this._magScale = [ 0, 0, 0 ];
  this._magCalibration = [ 0, 0, 0 ];
  this._currentAKData = [ 0, 0, 0 ];
}

imu.prototype =
{
  enable: function()
  {
    this._adOrientation = this._node.advertise(TOPIC_ORIENTATION);
    this._adCalibration = this._node.advertise(TOPIC_CALIBRATION);

    this._configure(this._reset);
    this._clock = setInterval(() => {
      this._processTick();
    }, 100);
    return this;
  },

  disable: function()
  {
    clearInterval(this._clock);
    this._clock = null;

    this._node.unadvertise(TOPIC_ORIENTATION);
    this._node.unadvertise(TOPIC_CALIBRATION);

    return this;
  },

  _processTick: function()
  {
    this._updateQuaternion();
  },

  _updateQuaternion: function()
  {
    let data = this._readMPU9250Data();

    const ax = data[0] * ARES - this._accelBias[0];
    const ay = data[1] * ARES - this._accelBias[1];
    const az = data[2] * ARES - this._accelBias[2];

    const gx = data[4] * GRES;
    const gy = data[5] * GRES;
    const gz = data[6] * GRES;

    data = this._readAK8963Data();

    const mx = (data[0] * MRES * this._magCalibration[0] - this._magBias[0]) * this._magScale[0];
    const my = (data[1] * MRES * this._magCalibration[1] - this._magBias[1]) * this._magScale[1];
    const mz = (data[2] * MRES * this._magCalibration[2] - this._magBias[2]) * this._magScale[2];

    this._MadgwickQuaternionUpdate(-ax, ay, az, gx * Math.PI / 180.0, -gy * Math.PI / 180.0, -gz * Math.PI / 180.0,  my,  -mx, mz);

    this._adOrientation.publish(
    {
      name: this._name,
      confidence: 3,
      w: this._q[0],
      x: this._q[1],
      y: this._q[2],
      z: this._q[3]
    });
  },

  _configure: function(reset)
  {
    
    if (reset || !this._loadCalibrationData()) {
      console.info('Calibrating: begin');
      this._adCalibration.publish({ confidence: 0 })

      this._calibrateMPU9250();
      this._configureMPU9250();
      this._calibrateAK8963();
      this._configureAK8963();
      this._saveCalibrationDate();

      this._adCalibration.publish({ confidence: 3 })
      console.info('Calibrating: done');
    }
    else
    {
      this._updateRawBiasMPU9250();
      this._configureMPU9250();
      this._configureAK8963();
    }
    this._lastUpdate = Date.now();
  },

  _configureMPU9250: function()
  {
    const write = (address, byte) => {
      this._writeMPU9250(address, byte);
    }
    const read = (address) => {
      return this._readMPU9250(address);
    }

    write(MPU9250.PWR_MGMT_1, 0x00);
    this._delay(100);
    write(MPU9250.PWR_MGMT_1, 0x01);
    this._delay(200);

    write(MPU9250.CONFIG, 3);
    write(MPU9250.SMPLRT_DIV, 0x04);

    let c = read(MPU9250.GYRO_CONFIG);
    write(MPU9250.GYRO_CONFIG, (GSCALE << 3) | (c & 0xE4));

    c = read(MPU9250.ACCEL_CONFIG);
    write(MPU9250.ACCEL_CONFIG, (ASCALE << 3) | (c & 0xE7));

    c = read(MPU9250.ACCEL_CONFIG2);
    write(MPU9250.ACCEL_CONFIG2, 0x03 | (c & 0xF0));

    write(MPU9250.INT_PIN_CFG, 0x12);
    write(MPU9250.INT_ENABLE, 0x01);

    this._delay(100);
  },

  _configureAK8963: function()
  {
    const write = (address, byte) => {
      this._writeAK8963(address, byte);
    }
    const read = (address, len) => {
      return this._readAK8963Bytes(address, len);
    }

    const whoami = read(AK8963.WHOAMI, 1)[0];
    if (whoami !== 0x48 && !SIMULATOR)
    {
      throw new Error();
    }

    write(AK8963.CNTL, 0x00);
    this._delay(10);
    write(AK8963.CNTL, 0x0F);
    this._delay(10);
    const data = read(AK8963.ASAX, 3);
    write(AK8963.CNTL, 0x00);
    this._delay(10);
    write(AK8963.CNTL, MSCALE << 4 | MMODE);
    this._magCalibration = [
      1 + (data.readUInt8(0) - 128) / 256.0,
      1 + (data.readUInt8(1) - 128) / 256.0,
      1 + (data.readUInt8(2) - 128) / 256.06
    ];
  },

  _calibrateMPU9250: function()
  {
    const write = (address, byte) => {
      this._writeMPU9250(address, byte);
    }
    const read = (address, length) => {
      return this._readMPU9250Bytes(address, length);
    }
    const delay = (ms) => {
      this._delay(ms);
    }
    
    let gyro_bias  = [ 0, 0, 0 ];
    let accel_bias = [ 0, 0, 0 ];
      
    // reset device
    write(MPU9250.PWR_MGMT_1, 0x80); // Write a one to bit 7 reset bit; toggle reset device
    delay(100);
      
    // get stable time source; Auto select clock source to be PLL gyroscope reference if ready 
    // else use the internal oscillator, bits 2:0 = 001
    write(MPU9250.PWR_MGMT_1, 0x01);  
    write(MPU9250.PWR_MGMT_2, 0x00);
    delay(200);                                    
    
    // Configure device for bias calculation
    write(MPU9250.INT_ENABLE, 0x00);   // Disable all interrupts
    write(MPU9250.FIFO_EN, 0x00);      // Disable FIFO
    write(MPU9250.PWR_MGMT_1, 0x00);   // Turn on internal clock source
    write(MPU9250.I2C_MST_CTRL, 0x00); // Disable I2C master
    write(MPU9250.USER_CTRL, 0x00);    // Disable FIFO and I2C master modes
    write(MPU9250.USER_CTRL, 0x0C);    // Reset FIFO and DMP
    delay(15);
      
    // Configure MPU6050 gyro and accelerometer for bias calculation
    write(MPU9250.CONFIG, 0x01);      // Set low-pass filter to 188 Hz
    write(MPU9250.SMPLRT_DIV, 0x00);  // Set sample rate to 1 kHz
    write(MPU9250.GYRO_CONFIG, 0x00);  // Set gyro full-scale to 250 degrees per second, maximum sensitivity
    write(MPU9250.ACCEL_CONFIG, 0x00); // Set accelerometer full-scale to 2 g, maximum sensitivity
    
    let gyrosensitivity  = 131;   // = 131 LSB/degrees/sec
    let accelsensitivity = 16384;  // = 16384 LSB/g
    
    // Configure FIFO to capture accelerometer and gyro data for bias calculation
    write(MPU9250.USER_CTRL, 0x40);   // Enable FIFO  
    write(MPU9250.FIFO_EN, 0x78);     // Enable gyro and accelerometer sensors for FIFO  (max size 512 bytes in MPU-9150)
    delay(40); // accumulate 40 samples in 40 milliseconds = 480 bytes
    
    // At end of sample accumulation, turn off FIFO sensor read
    write(MPU9250.FIFO_EN, 0x00);        // Disable gyro and accelerometer sensors for FIFO
    let data = read(MPU9250.FIFO_COUNTH, 2); // read FIFO sample count
    let fifo_count = data.readUInt16BE(0);
    let packet_count = Math.floor(fifo_count / 12);// How many sets of full gyro and accelerometer data for averaging
      
    for (let ii = 0; ii < packet_count; ii++) 
    {
      const fdata = read(MPU9250.FIFO_R_W, 12); // read data for averaging
      let accel_temp =
      [
        fdata.readInt16BE(0),
        fdata.readInt16BE(2),
        fdata.readInt16BE(4)
      ]; 
      let gyro_temp =
      [
        fdata.readInt16BE(6),
        fdata.readInt16BE(8),
        fdata.readInt16BE(10)
      ];
      
      accel_bias[0] += accel_temp[0]; // Sum individual signed 16-bit biases to get accumulated signed 32-bit biases
      accel_bias[1] += accel_temp[1];
      accel_bias[2] += accel_temp[2];
      gyro_bias[0]  += gyro_temp[0];
      gyro_bias[1]  += gyro_temp[1];
      gyro_bias[2]  += gyro_temp[2];    
    }

    accel_bias[0] /= packet_count; // Normalize sums to get average count biases
    accel_bias[1] /= packet_count;
    accel_bias[2] /= packet_count;
    gyro_bias[0]  /= packet_count;
    gyro_bias[1]  /= packet_count;
    gyro_bias[2]  /= packet_count;
      
    if (accel_bias[2] > 0)
    {
      accel_bias[2] -= accelsensitivity;
    }  // Remove gravity from the z-axis accelerometer bias calculation
    else
    {
      accel_bias[2] += accelsensitivity;
    }
      
    // Construct the gyro biases for push to the hardware gyro bias registers, which are reset to zero upon device startup
    this._gyroBiasRaw =
    [
      (-gyro_bias[0] / 4  >> 8) & 0xFF, // Divide by 4 to get 32.9 LSB per deg/s to conform to expected bias input format
      (-gyro_bias[0] / 4)       & 0xFF, // Biases are additive, so change sign on calculated average gyro biases
      (-gyro_bias[1] / 4  >> 8) & 0xFF,
      (-gyro_bias[1] / 4)       & 0xFF,
      (-gyro_bias[2] / 4  >> 8) & 0xFF,
      (-gyro_bias[2] / 4)       & 0xFF
    ];
  
    // Push gyro biases to hardware registers
    this._updateRawBiasMPU9250();
    
    // Output scaled gyro biases 
    this._gyroBias =
    [
      gyro_bias[0] / gyrosensitivity,
      gyro_bias[1] / gyrosensitivity,
      gyro_bias[2] / gyrosensitivity
    ];
    
    // Output scaled accelerometer biases 
    this._accelBias =
    [
      accel_bias[0] / accelsensitivity,
      accel_bias[1] / accelsensitivity,
      accel_bias[2] / accelsensitivity
    ];
  },

  _updateRawBiasMPU9250: function()
  {
    const write = (address, byte) => {
      this._writeMPU9250(address, byte);
    }
    const data = this._gyroBiasRaw;
    write(MPU9250.XG_OFFSET_H, data[0]);
    write(MPU9250.XG_OFFSET_L, data[1]);
    write(MPU9250.YG_OFFSET_H, data[2]);
    write(MPU9250.YG_OFFSET_L, data[3]);
    write(MPU9250.ZG_OFFSET_H, data[4]);
    write(MPU9250.ZG_OFFSET_L, data[5]);
  },

  _calibrateAK8963: function()
  {
    const sample_count = SIMULATOR ? 1 : 1500;  // (MMODE==6) at 100 Hz ODR, new mag data is available every 10 ms
    const sample_delay = 12; // (MMODE==6) at 100 Hz ODR, new mag data is available every 10 ms

    this._delay(4000);
  
    // shoot for ~fifteen seconds of mag data
    let mag_max = [ -32767, -32767, -32767 ];
    let mag_min = [  32767,  32767,  32767 ];
    for (let ii = 0; ii < sample_count; ii++)
    {
      const data = this._readAK8963Data();  // Read the mag data   
      for (let jj = 0; jj < 3; jj++)
      {
        if (data[jj] > mag_max[jj])
        {
          mag_max[jj] = data[jj];
        }
        if (data[jj] < mag_min[jj])
        {
          mag_min[jj] = data[jj];
        }
      }
      this._delay(sample_delay);
    }

    // Get hard iron correction
    const mag_bias =
    [
      (mag_max[0] + mag_min[0]) / 2,  // get average x mag bias in counts
      (mag_max[1] + mag_min[1]) / 2,  // get average y mag bias in counts
      (mag_max[2] + mag_min[2]) / 2   // get average z mag bias in counts
    ];
       
    // Get soft iron correction estimate
    const mag_scale =
    [
      (mag_max[0] - mag_min[0]) / 2,  // get average x axis max chord length in counts
      (mag_max[1] - mag_min[1]) / 2,  // get average y axis max chord length in counts
      (mag_max[2] - mag_min[2]) / 2   // get average z axis max chord length in counts
    ];
    const avg_rad = ((mag_scale[0] + mag_scale[1] + mag_scale[2]) / 3);

    this._magBias = [ mag_bias[0] * MRES * this._magCalibration[0], mag_bias[1] * MRES * this._magCalibration[1], mag_bias[2] * MRES * this._magCalibration[2] ];
    if (avg_rad === 0)
    {
      this._magScale = [ 1, 1, 1 ];
    }
    else
    {
      this._magScale = [ avg_rad / mag_scale[0], avg_rad / mag_scale[1], avg_rad / mag_scale[2] ];
    }
  },

  _readMPU9250Data: function()
  {
    const raw = this._readMPU9250Bytes(MPU9250.ACCEL_XOUT_H, 14);
    return [
      raw.readInt16BE(0),
      raw.readInt16BE(2),
      raw.readInt16BE(4),
      raw.readInt16BE(6),
      raw.readInt16BE(8),
      raw.readInt16BE(10),
      raw.readInt16BE(12)
    ];
  },

  _readAK8963Data: function()
  {
    if ((this._readAK8963(AK8963.ST1) & 0x01) != 0)
    {
      const data = this._readAK8963Bytes(AK8963.XOUT_L, 7);
      this._currentAKData =
      [
        data.readInt16LE(0),
        data.readInt16LE(2),
        data.readInt16LE(4)
      ];
    }
    return this._currentAKData;
  },

  _writeMPU9250: function(address, byte)
  {
    this._i2cMPU9250.writeBytes(Buffer.from([ address, byte ]));
  },

  _readMPU9250: function(address)
  {
    const data = this._i2cMPU9250.writeAndReadBytes(Buffer.from([ address ]), 1);
    return data[0];
  },

  _readMPU9250Bytes: function(address, length)
  {
    const data = this._i2cMPU9250.writeAndReadBytes(Buffer.from([ address ]), length);
    return data;
  },

  _writeAK8963: function(address, byte)
  {
    this._i2cAK8963.writeBytes(Buffer.from([ address, byte ]));
  },

  _readAK8963: function(address)
  {
    const data = this._i2cAK8963.writeAndReadBytes(Buffer.from([ address ]), 1);
    return data[0];
  },

  _readAK8963Bytes: function(address, length)
  {
    const data = this._i2cAK8963.writeAndReadBytes(Buffer.from([ address ]), length);
    return data;
  },

  _saveCalibrationDate: function()
  {
    const calibrationData =
    {
      magBias: this._magBias,
      magScale: this._magScale,
      accelBias: this._accelBias,
      gyroBias: this._gyroBias,
      gyroBiasRaw: this._gyroBiasRaw
    };
    fs.writeFileSync('./saved/imu-calibration-data' + this._name.replace(/\//g, '-') + '.json', JSON.stringify(calibrationData));
  },

  _loadCalibrationData: function()
  {
    try
    {
      const calibrationData = JSON.parse(fs.readFileSync('./saved/imu-calibration-data' + this._name.replace(/\//g, '-') + '.json'));
      this._magBias = calibrationData.magBias;
      this._magScale = calibrationData.magScale;
      this._accelBias = calibrationData.accelBias;
      this._gyroBias = calibrationData.gyroBias;
      this._gyroBiasRaw = calibrationData.gyroBiasRaw;
      return true;
    }
    catch (_)
    {
      return false;
    }
  },

  _delay: function(ms)
  {
    const finish = Date.now() + ms;
    while (Date.now() < finish)
      ;
  },

  _MadgwickQuaternionUpdate: function(ax, ay, az, gx, gy, gz, mx, my, mz)
  {
    const now = Date.now();
    const deltat = (now - this._lastUpdate) / 1000;
    this._lastUpdate = now;

    let q1 = this._q[0], q2 = this._q[1], q3 = this._q[2], q4 = this._q[3];   // short name local variable for readability
    let norm;
    let hx, hy, _2bx, _2bz;
    let s1, s2, s3, s4;
    let qDot1, qDot2, qDot3, qDot4;

    // Auxiliary variables to avoid repeated arithmetic
    let _2q1mx;
    let _2q1my;
    let _2q1mz;
    let _2q2mx;
    let _4bx;
    let _4bz;
    let _2q1 = 2.0 * q1;
    let _2q2 = 2.0 * q2;
    let _2q3 = 2.0 * q3;
    let _2q4 = 2.0 * q4;
    let _2q1q3 = 2.0 * q1 * q3;
    let _2q3q4 = 2.0 * q3 * q4;
    let q1q1 = q1 * q1;
    let q1q2 = q1 * q2;
    let q1q3 = q1 * q3;
    let q1q4 = q1 * q4;
    let q2q2 = q2 * q2;
    let q2q3 = q2 * q3;
    let q2q4 = q2 * q4;
    let q3q3 = q3 * q3;
    let q3q4 = q3 * q4;
    let q4q4 = q4 * q4;

    // Normalise accelerometer measurement
    norm = Math.sqrt(ax * ax + ay * ay + az * az);
    if (norm == 0.0) return; // handle NaN
    norm = 1.0/norm;
    ax *= norm;
    ay *= norm;
    az *= norm;

    // Normalise magnetometer measurement
    norm = Math.sqrt(mx * mx + my * my + mz * mz);
    if (norm == 0.0) return; // handle NaN
    norm = 1.0/norm;
    mx *= norm;
    my *= norm;
    mz *= norm;

    // Reference direction of Earth's magnetic field
    _2q1mx = 2.0 * q1 * mx;
    _2q1my = 2.0 * q1 * my;
    _2q1mz = 2.0 * q1 * mz;
    _2q2mx = 2.0 * q2 * mx;
    hx = mx * q1q1 - _2q1my * q4 + _2q1mz * q3 + mx * q2q2 + _2q2 * my * q3 + _2q2 * mz * q4 - mx * q3q3 - mx * q4q4;
    hy = _2q1mx * q4 + my * q1q1 - _2q1mz * q2 + _2q2mx * q3 - my * q2q2 + my * q3q3 + _2q3 * mz * q4 - my * q4q4;
    _2bx = Math.sqrt(hx * hx + hy * hy);
    _2bz = -_2q1mx * q3 + _2q1my * q2 + mz * q1q1 + _2q2mx * q4 - mz * q2q2 + _2q3 * my * q4 - mz * q3q3 + mz * q4q4;
    _4bx = 2.0 * _2bx;
    _4bz = 2.0 * _2bz;

    // Gradient decent algorithm corrective step
    s1 = -_2q3 * (2.0 * q2q4 - _2q1q3 - ax) + _2q2 * (2.0 * q1q2 + _2q3q4 - ay) - _2bz * q3 * (_2bx * (0.5 - q3q3 - q4q4) + _2bz * (q2q4 - q1q3) - mx) + (-_2bx * q4 + _2bz * q2) * (_2bx * (q2q3 - q1q4) + _2bz * (q1q2 + q3q4) - my) + _2bx * q3 * (_2bx * (q1q3 + q2q4) + _2bz * (0.5 - q2q2 - q3q3) - mz);
    s2 = _2q4 * (2.0 * q2q4 - _2q1q3 - ax) + _2q1 * (2.0 * q1q2 + _2q3q4 - ay) - 4.0 * q2 * (1.0 - 2.0 * q2q2 - 2.0 * q3q3 - az) + _2bz * q4 * (_2bx * (0.5 - q3q3 - q4q4) + _2bz * (q2q4 - q1q3) - mx) + (_2bx * q3 + _2bz * q1) * (_2bx * (q2q3 - q1q4) + _2bz * (q1q2 + q3q4) - my) + (_2bx * q4 - _4bz * q2) * (_2bx * (q1q3 + q2q4) + _2bz * (0.5 - q2q2 - q3q3) - mz);
    s3 = -_2q1 * (2.0 * q2q4 - _2q1q3 - ax) + _2q4 * (2.0 * q1q2 + _2q3q4 - ay) - 4.0 * q3 * (1.0 - 2.0 * q2q2 - 2.0 * q3q3 - az) + (-_4bx * q3 - _2bz * q1) * (_2bx * (0.5 - q3q3 - q4q4) + _2bz * (q2q4 - q1q3) - mx) + (_2bx * q2 + _2bz * q4) * (_2bx * (q2q3 - q1q4) + _2bz * (q1q2 + q3q4) - my) + (_2bx * q1 - _4bz * q3) * (_2bx * (q1q3 + q2q4) + _2bz * (0.5 - q2q2 - q3q3) - mz);
    s4 = _2q2 * (2.0 * q2q4 - _2q1q3 - ax) + _2q3 * (2.0 * q1q2 + _2q3q4 - ay) + (-_4bx * q4 + _2bz * q2) * (_2bx * (0.5 - q3q3 - q4q4) + _2bz * (q2q4 - q1q3) - mx) + (-_2bx * q1 + _2bz * q3) * (_2bx * (q2q3 - q1q4) + _2bz * (q1q2 + q3q4) - my) + _2bx * q2 * (_2bx * (q1q3 + q2q4) + _2bz * (0.5 - q2q2 - q3q3) - mz);
    norm = Math.sqrt(s1 * s1 + s2 * s2 + s3 * s3 + s4 * s4);    // normalise step magnitude
    norm = 1.0/norm;
    s1 *= norm;
    s2 *= norm;
    s3 *= norm;
    s4 *= norm;

    // Compute rate of change of quaternion
    qDot1 = 0.5 * (-q2 * gx - q3 * gy - q4 * gz) - BETA * s1;
    qDot2 = 0.5 * (q1 * gx + q3 * gz - q4 * gy) - BETA * s2;
    qDot3 = 0.5 * (q1 * gy - q2 * gz + q4 * gx) - BETA * s3;
    qDot4 = 0.5 * (q1 * gz + q2 * gy - q3 * gx) - BETA * s4;

    // Integrate to yield quaternion
    q1 += qDot1 * deltat;
    q2 += qDot2 * deltat;
    q3 += qDot3 * deltat;
    q4 += qDot4 * deltat;
    norm = Math.sqrt(q1 * q1 + q2 * q2 + q3 * q3 + q4 * q4);    // normalise quaternion
    norm = 1.0/norm;

    this._q[0] = q1 * norm;
    this._q[1] = q2 * norm;
    this._q[2] = q3 * norm;
    this._q[3] = q4 * norm;
  }
};

module.exports = imu;
