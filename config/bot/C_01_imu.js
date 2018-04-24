module.exports = function()
{
  const i2c = I2C.open(
  {
    address: 0x29
  });
  if (i2c.valid())
  {
    const Imu = require('hw/imu/imu-bno055');
    return new Imu(
    {
      name: '/imu/node',
      reset: true,
      extClock: false,
      i2c: i2c,
      remap: { x: -Imu.X_AXIS, y: -Imu.Y_AXIS, z: Imu.Z_AXIS }
    });
  }
}
