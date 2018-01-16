module.exports = function()
{
  const Kinematics = require('services/kinematics');
  return new Kinematics(
  {
    name: '/kinematics/manager',
    monitor: [ '/imu/body' ],
    calibrationTimeout: 5000
  });
}
