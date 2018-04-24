module.exports = function()
{
  const Encoder = require('hw/encoder/encoder-gpio');
  return new Encoder(
  {
    name: '/encoder/1/node',
    gpio: GPIO.open({ channel: 'GPIO23' }),
    countsPerRevolution: 10
  });
}
