console.info('Loading Raspberry Pi board.');

const native = require('./native/build/Release/i2cNative.node');

// Shutdown native controller smoothly when we exit.
process.on('exit', function()
{
  native.shutdown();
});

module.exports = native;
