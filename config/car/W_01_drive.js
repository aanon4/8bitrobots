module.exports = function()
{
  const AXLE = require('services/axle');
  const SERVO = require('hw/servo/servo-hs422');
  const WHEEL = require('hw/wheel/wheel-63mm');
  const MOTOR = require('hw/motor/motor-tenshock-rc906-11y-1750kv');
  const VESC = require('hw/esc/esc-vesc');
  const GEARING = require('hw/gear/gear-driveshaft-tt01');

  const vesc = new VESC(
  {
    name: '/car/drive/vesc/node',
    can:
    {
      can: CAN,
      remoteId: 1,
      localId: 16
    }
  });

  return new AXLE(
  {
    name: '/car/drive/node',
    drive: new WHEEL(
    {
      name: '/car/drive/wheel/node',
      motor: new GEARING(
      {
        next: new MOTOR(
        {
          esc: vesc,
          reverse: false
        })
      }),
      ros: 'topicOnly'
    }),
    steering: new SERVO(
    {
      name: `/car/drive/servo/node`,
      pwm: vesc.openServo(),
      minAngle: Math.PI / 2 - 0.50,
      maxAngle: Math.PI / 2 + 0.50,
      defaultAngle: Math.PI / 2,
      trim: 0,
      reverse: true,
      ros: 'topicOnly'
    })
  });
}
