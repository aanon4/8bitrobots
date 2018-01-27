'use strict';

console.info('Loading I2C');

const I2C = require('hw/board/beagleboneblue/i2c');
global.I2C =
[
  I2C.open({ bus: 2 }),
  I2C.open({ bus: 1 })
];

module.exports = function() {}
