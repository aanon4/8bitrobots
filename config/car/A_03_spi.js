console.info('Loading SPI');

const SPI = require('hw/board/raspberrypi/spi');
global.SPI = SPI.open({
  channel: 0,
  mode: 0,
  speed: 8000000, // 8Mhz
});

module.exports = function() {}
