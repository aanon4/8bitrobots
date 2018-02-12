const Pwm = require('hw/pwm/pwm-pca9685');
//const Pwm = require('hw/board/raspberrypi/pwm-pca9685');

const i2c = I2C.open(
{
  address: 0x42
});
if (i2c.valid())
{
  global.PWM = new Pwm(
  {
    i2c: i2c
  });
}

module.exports = function() {}
