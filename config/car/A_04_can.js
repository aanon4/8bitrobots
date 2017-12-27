console.info('Loading CAN');

const CAN = require('hw/can/can-mcp2515');
global.CAN = new CAN(
{
  spi: new SPI.open(),
  speed: 500, // 500kbs
  interrupt: GPIO.getChannel(
  {
    channel: 0
  })
});

module.exports = function() {}
