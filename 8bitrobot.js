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
require('./modules/ros');
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

