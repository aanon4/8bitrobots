module.exports = function()
{
  const Kinematics = require('modules/kinematics');
  return new Kinematics(
  {
    name: '/kinematics/node',
    monitor:
    [
      { name: '/imu', headingOffset: 0 }
    ],
    calibrationTimeout: 5000
  });
}
