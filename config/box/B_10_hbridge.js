const HBridge = require('hw/hbridge/hbridge-drv8833');

if (typeof PWM !== 'undefined')
{
  global.HBRIDGE = new HBridge(
  {
    v: 5.0,
    ain1: PWM.open({ channel: 15 }),
    ain2: PWM.open({ channel: 14 }),
    bin1: PWM.open({ channel: 13 }),
    bin2: PWM.open({ channel: 12 })
  });
}

module.exports = function() {}
