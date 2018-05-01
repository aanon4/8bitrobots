'use strict';

console.info('Loading App.');

const VM = require('vm');
const ConfigManager = require('modules/config-manager');

function app(config)
{
  this._name = config.name;
  this._node = Node.init(this._name);
  this._config = new ConfigManager(this,
  {
    source: config.source || '',
    code: config.code || ''
  });
  this._enabled = 0;
  this._config.enable();
}

app.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._enable();
    }
    return this;
  },

  _enable: function()
  {
    this._topics = {};
    this._topicQ = [];
    this._topicQPending = null;
    this._terminated = false;
    try
    {
      VM.runInNewContext(
        this._config.get('code'),
        {
          App:
          {
            getTopicValue: (topicName, key) => { return this._getTopicValue(topicName, key) },
            subscribeToTopic: (topicName) => { return this._subscribeToTopic(topicName) },
            syncTopicUpdates: () => { return this._syncTopicUpdates() },
            hasTerminated: () => { return this._terminated; },
          }
        }
      );
    }
    catch (e)
    {
      console.error(e);
    }
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._disable();
    }
    return this;
  },

  _disable: function()
  {
    this._terminated = true;
    this._unsubscribeAllTopic();
  },

  reconfigure: function(changes)
  {
    if (this._enabled && changes.code)
    {
      this._disable();
      this._enable();
    }
  },

  _getTopicValue: function(topicName, key)
  {
    return (this._topics[topicName] || {})[key];
  },

  _subscribeToTopic: function(topicName)
  {
    if (!this._topics[topicName])
    {
      this._topics[topicName] = {};
      this._node.subscribe({ topic: topicName }, (event) => {
        this._topicQ.push(event);
        this._topicQPending && this._topicQPending();
      });
    }
  },

  _unsubscribeAllTopic: function()
  {
    for (let topic in this._topics)
    {
      this._node.unsubscribe({ topic: topic });
    }
    this._topics = {};
  },

  _syncTopicUpdates: function()
  {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        if (this._terminated)
        {
          reject(new Error('Terminated'));
        }
        else if (this._topicQ.length === 0)
        {
          this._topicQPending = () => {
            this._topicQPending = null;
            this._syncTopicUpdates().then(resolve, reject);
          }
        }
        else
        {
          this._topicQ.forEach((event) => {
            Object.assign(this._topics[event.topic] || {}, event);
          });
          this._topicQ = [];
          resolve();
        }
      });;
    });
  }
};

module.exports = app;
