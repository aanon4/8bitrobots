console.info('Loading GPIO');

const GPIO = require('hw/board/raspberrypi/gpio');
global.GPIO = GPIO.open();

module.exports = function() {}
