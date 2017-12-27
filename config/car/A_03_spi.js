console.info('Loading SPI');

const SPI = require('hw/board/raspberrypi/spi');
global.SPI = SPI.open({
  bus: '/dev/spidev0.0',
  mode: 'MODE_0',
  maxSpeed: 5000000,
  bitsPerWord: 8,
  bitOrder: 'lsb',
  select: 'low'
});

module.exports = function() {}
