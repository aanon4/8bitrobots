'use strict';

console.info('Loading BeagleBoneBlue board.');

const native = require('./native/build/Release/beagleboneblue.node');

// Shutdown native controller smoothly when we exit.
process.on('exit', function()
{
  native.bbb_shutdown();
});

module.exports = native;
