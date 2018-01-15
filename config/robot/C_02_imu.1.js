'use strict';

module.exports = function()
{
  const Imu = require('hw/imu/imu-mpu9250');
  return new Imu(
  {
    name: '/imu/monitor', 
    reset: false,
    i2c:
    {
      MPU9250: I2C[0].open({ address: 0x68 }),
      AK8963: I2C[0].open({ address: 0x0C }),
    }
  });
}
