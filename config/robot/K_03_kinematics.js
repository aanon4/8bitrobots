module.exports = function()
{
  const Kinematics = require('services/kinematics');
  return new Kinematics(
  {
    name: '/kinematics/node',
    monitor:
    [
      { name: '/imu/body', headingOffset: 0 }
    ],
    calibrationTimeout: 5000
  });
}
