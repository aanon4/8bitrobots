module.exports = function()
{
  const i2c = new I2C[0](0x76, 0);
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
