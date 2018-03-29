module.exports = function()
{
  const i2c = I2C.open(
  {
    address: 0x76
  });
  if (i2c.valid())
  {
    const BMP = require('hw/environ/environ-bmp280');
    return new BMP(
    {
      name: '/atmos/node',
      i2c: i2c
    });
  }
}
