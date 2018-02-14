module.exports = function()
{
  const AXLE = require('modules/axle');
  const WHEEL = require('hw/wheel/wheel-108mm');
  const MOTOR = require('hw/servo-continuous/servo-continuous-fs90r');

  return new AXLE(
  {
    name: '/car/drive/node',
    left: new WHEEL(
    {
      name: '/car/drive/wheel/left/node',
      motor: new MOTOR(
      {
        pwm: PWM.open({ channel: 0 }),
        reverse: false
      }),
      api: 'topicOnly'
    }),
    right: new WHEEL(
    {
      name: '/car/drive/wheel/right/node',
      motor: new MOTOR(
      {
        pwm: PWM.open({ channel: 7 }),
        reverse: true
      }),
      api: 'topicOnly'
    }),
    maxVelocity: 0.4 // m/s
  });
}
