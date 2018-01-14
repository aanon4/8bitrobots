module.exports = function()
{
  const i2c = I2C[0].open(
  {
    address: 0x76
  });
  if (i2c.valid())
  {
    const HPT = require('hw/environ/environ-bmp280');
    return new HPT(
    {
      name: '/environ/monitor',
      i2c: i2c
    });
  }
}
