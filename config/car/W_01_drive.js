module.exports = function()
{
  const AXLE = require('services/axle');
  const SERVO = require('hw/servo/servo-hs422');
  const WHEEL = require('hw/wheel/wheel-42mm');
  const MOTOR = require('hw/motor/motor-surpass-3674-2y-2250kv');
  const VESC = require('hw/esc/esc-vesc');

  const vesc = new VESC(
  {
    name: '/car/drive/vesc/monitor',
    can:
    {
      can: CAN,
      id: { id: 0, ext: true }
    }
  });

  return new AXLE(
  {
    name: '/car/drive/axle',
    drive: new WHEEL(
    {
      name: '/car/drive/wheel/monitor',
      motor: new MOTOR(
      {
        esc: vesc
      }),
      ros: 'topicOnly'
    }),
    steering: new SERVO(
    {
      name: `/car/drive/servo/monitor`,
      pwm: vesc.openServo(),
      minAngle: Math.PI - 1,
      maxAngle: Math.PI + 1,
      defaultAngle: Math.PI,
      trim: 0,
      ros: 'topicOnly'
    })
  });
}
