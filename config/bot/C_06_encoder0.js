module.exports = function()
{
  const Encoder = require('hw/encoder/encoder-gpio');
  return new Encoder(
  {
    name: '/encoder/0/node',
    gpio: GPIO.open({ channel: 'GPIO22' }),
    countsPerRevolution: 10
  });
}
