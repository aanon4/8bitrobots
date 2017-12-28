console.info('Loading CAN');

const CAN = require('hw/can/can-mcp2515');
global.CAN = new CAN(
{
  spi: SPI.open(),
  speed: 500, // 500kbs
  interrupt: GPIO.open(
  {
    channel: 0
  })
});

module.exports = function() {}
