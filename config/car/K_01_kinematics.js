module.exports = function()
{
  const Kinematics = require('modules/kinematics');
  return new Kinematics(
  {
    name: '/kinematics/node',
    monitor:
    [
      { type: 'imu', name: '/imu' }
    ],
    calibrationTimeout: 5000
  });
}
