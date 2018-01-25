'use strict';

console.info('Starting Debugger.');

const util = require('util');


let debug = rosNode.init('/debug/node');
let adLog = debug.advertise({ topic: 'log' });

console.log = function()
{
  adLog.publish({ message: util.format.apply(this, arguments) });
  console.Console.prototype.log.apply(this, arguments);
}

console.warn = function()
{
  adLog.publish({ message: util.format.apply(this, arguments) });
  console.Console.prototype.warn.apply(this, arguments);
}

console.info = function()
{
  adLog.publish({ message: util.format.apply(this, arguments) });
  console.Console.prototype.info.apply(this, arguments);
}

console.error = function()
{
  adLog.publish({ message: util.format.apply(this, arguments) });
  console.Console.prototype.error.apply(this, arguments);
}
