module.exports = function()
{
  const Kinematics = require('modules/kinematics');
  return new Kinematics(
  {
    name: '/kinematics/node',
    monitor:
    [
      { type: 'imu', name: '/imu/body' }
    ],
    calibrationTimeout: 5000
  });
}
