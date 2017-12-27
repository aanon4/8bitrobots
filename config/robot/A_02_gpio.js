console.info('Loading GPIO');

const GPIO = require('hw/board/beagleboneblue/gpio-beagleboneblue');
global.GPIO = GPIO.open();

module.exports = function() {}
