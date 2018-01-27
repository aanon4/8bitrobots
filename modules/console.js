'use strict';

console.info('Loading Console.');

const util = require('util');

const TOPIC_LOG = { topic: 'log' };

let adLog = null;

console.log = function()
{
  adLog && adLog.publish({ message: util.format.apply(this, arguments) });
  console.Console.prototype.log.apply(this, arguments);
}

console.warn = function()
{
  adLog && adLog.publish({ message: util.format.apply(this, arguments) });
  console.Console.prototype.warn.apply(this, arguments);
}

console.info = function()
{
  adLog && adLog.publish({ message: util.format.apply(this, arguments) });
  console.Console.prototype.info.apply(this, arguments);
}

console.error = function()
{
  adLog && adLog.publish({ message: util.format.apply(this, arguments) });
  console.Console.prototype.error.apply(this, arguments);
}

// Log any uncaught exceptions
process.on('uncaughtException', function(e)
{
  console.error('Uncaught exception:');
  console.error(e.stack);
});
// Log any unhandled promise exceptions
process.on('unhandledRejection', function(e, p)
{
  console.error('Unhandled Promise rejection:');
  console.error(e.stack);
});

function comm(config)
{
  this._name = '/console/node';
  this._node = rosNode.init(this._name);
}

comm.prototype =
{
  enable: function()
  {
    adLog = this._node.advertise(TOPIC_LOG);
    return this;
  },
  
  disable: function()
  {
    adLog = null;
    this._node.unadvertise(TOPIC_LOG);
    return this;
  }
}

module.exports = comm;
