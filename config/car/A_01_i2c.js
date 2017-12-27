console.info('Loading I2C');

const I2C = require('hw/board/raspberrypi/i2c');
global.I2C = I2C.open({ bus: 1 });

module.exports = function() {}
