module.exports = function()
{
  const Imu = require('hw/imu/imu-bno055');
  return new Imu(
  {
    name: '/imu/node',
    reset: true,
    extClock: true,
    uart: { port: '/dev/ttyS0', baud: 115200 },
    remap: { x: -Imu.X_AXIS, y: -Imu.Y_AXIS, z: Imu.Z_AXIS }
  });
}
