module.exports = function()
{
  const Kinematics = require('modules/kinematics');
  return new Kinematics(
  {
    name: '/kinematics/node',
    monitor:
    [
      { type: 'imu', name: '/imu' },
      { type: 'air', name: '/atmos' }
    ],
    calibrationTimeout: 5000
  });
}
