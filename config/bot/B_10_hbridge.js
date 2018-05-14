const HBridge = require('hw/hbridge/hbridge-drv8833');

if (typeof PWM !== 'undefined')
{
  global.HBRIDGE = new HBridge(
  {
    name: '/i2c/3/66/pwm/hbridge/node',
    ain1: PWM.open({ channel: 15 }),
    ain2: PWM.open({ channel: 14 }),
    bin1: PWM.open({ channel: 13 }),
    bin2: PWM.open({ channel: 12 })
  }).enable();
}

module.exports = function() {}
