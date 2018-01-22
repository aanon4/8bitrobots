module.exports = function()
{
  const Kinematics = require('services/kinematics');
  return new Kinematics(
  {
    name: '/kinematics/manager',
    monitor:
    [
      { name: '/imu/body', headingOffset: 0 }
    ],
    calibrationTimeout: 5000
  });
}
