module.exports = function()
{
  const i2c = I2C.open(
  {
    address: 0x40
  });
  if (i2c.valid())
  {
    const Power = require('hw/power/power-ina219');
    return new Power(
    {
      name: '/power/node',
      i2c: i2c
    });
  }
}
