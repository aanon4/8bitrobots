console.info('Loading GPIO');

const GPIO = require('hw/board/beagleboneblue/gpio');
global.GPIO = GPIO.open();

module.exports = function() {}
