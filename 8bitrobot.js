#! /usr/bin/env node

//
// Debugging level
//
DEBUG=9

global.self = global;

// Configuration based on hostname unless overridden
const hostname = require('os').hostname().split('.');
global.configName = hostname[0];
if (process.argv.length >= 3)
{
  configName = process.argv[2];
}

console.info('*** Starting 8BitRobot: ' + configName);

// Load up some generally useful pieces before we load specific modules.
require('./modules/globals');
require('./modules/8bit');
require('./modules/services').loadConfig(configName);

// Shutdown cleanly
process.on('SIGINT', function()
{
  process.exit();
});
process.on('SIGHUP', function()
{
  process.exit();
});

// If battery gets critical, we shut everything down to avoid over-discharging it.
Node.init(`${hostname}/node`).subscribe({ topic: '/health/status' }, (event) => {
  if (event.status === 'battery-critical')
  {
    require('child_process').spawn('/sbin/shutdown', [ '-h', '+1' ]);
  }
});
