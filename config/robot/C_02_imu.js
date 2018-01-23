'use strict';

module.exports = function()
{
  const i2cMPU9250 = I2C[0].open({ address: 0x68 });
  if (i2cMPU9250.valid())
  {
    const Imu = require('hw/imu/imu-mpu9250');
    return new Imu(
    {
      name: '/imu/body/node', 
      reset: false,
      i2c:
      {
        MPU9250: i2cMPU9250,
        AK8963: I2C[0].open({ address: 0x0C }),
      }
    });
  }
}
