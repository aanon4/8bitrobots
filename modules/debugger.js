'use strict';

console.info('Loading Debugger.');

const util = require('util');

//
// Debug levels:
//
// 0: Errors
// 1: Warnings
// 2: Info
// 3: Log
//

let debug = rosNode.init('/debug/logger');
let adLog = debug.advertise({ topic: 'log' });
let adWarn = debug.advertise({ topic: 'warn' });
let adInfo = debug.advertise({ topic: 'info' });
let adError = debug.advertise({ topic: 'error' });

console.log = function()
{
  adLog.publish({ message: util.format.apply(this, arguments) });
  if (DEBUG >= 3)
  {
    console.Console.prototype.log.apply(this, arguments);
  }
}

console.warn = function()
{
  adWarn.publish({ message: util.format.apply(this, arguments) });
  if (DEBUG >= 2)
  {
    console.Console.prototype.warn.apply(this, arguments);
  }
}

console.info = function()
{
  adInfo.publish({ message: util.format.apply(this, arguments) });
  if (DEBUG >= 1)
  {
    console.Console.prototype.info.apply(this, arguments);
  }
}

console.error = function()
{
  adError.publish({ message: util.format.apply(this, arguments) });
  if (DEBUG >= 0)
  {
    console.Console.prototype.error.apply(this, arguments);
  }
}
