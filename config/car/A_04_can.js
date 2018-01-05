console.info('Loading CAN');

const CAN = require('hw/can/can-mcp2515');
global.CAN = new CAN(
{
  spi: SPI.open(),
  speed: 500, // kbs
  interrupt: GPIO.open({ channel: 5 })
});

module.exports = function() {}
