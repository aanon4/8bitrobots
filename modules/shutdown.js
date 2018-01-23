'use strict';

console.info('Loading Shutdown Monitor.');

const childProcess = require('child_process');

const TOPIC_SHUTDOWN = { topic: '/health/shutdown' };


function shutdown(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
}

shutdown.prototype =
{
  enable: function()
  {
    this._node.subscribe(TOPIC_SHUTDOWN, (event) =>
    {
      if (event.shutdown === 'low-battery')
      {
        childProcess.spawn('/sbin/shutdown', [ '-h', 'now' ], {});
      }
    });
    return this;
  },
  
  disable: function()
  {
    this._node.unsubscribe(TOPIC_SHUTDOWN);
    return this;
  }
}

module.exports = shutdown;
