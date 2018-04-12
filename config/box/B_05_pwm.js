const Pwm = require('hw/pwm/pwm-pca9685');

const i2c = I2C.open(
{
  address: 0x42
});
if (i2c.valid())
{
  global.PWM = new Pwm(
  {
    name: '/pwm-i2c',
    i2c: i2c,
    prescaleTweak: 7,
    excludeApi: [ 10, 11, 12, 13, 14, 15 ]
  });
}

module.exports = function() {}
