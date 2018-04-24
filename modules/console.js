'use strict';

console.info('Loading Console.');

const util = require('util');

const TOPIC_LOG = { topic: 'log', schema: { message: 'String' }, friendlyName: 'Console' };

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
  this._node = Node.init(this._name);
  this._enabled = 0;
}

comm.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      adLog = this._node.advertise(TOPIC_LOG);
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      adLog = null;
      this._node.unadvertise(TOPIC_LOG);
    }
    return this;
  }
}

module.exports = comm;
