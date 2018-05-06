'use strict';

console.info('Loading App Container.');

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
    this._topicQPending = {};
    this._services = {};
    this._noUpdates = {};
    this._activities = [];
    this._configurations = [];
    this._terminated = false;
    try
    {
      VM.runInNewContext(
        this._config.get('code'),
        {
          App:
          {
            registerActivity: (activity) => { this._registerActivity(activity); },
            registerConfiguration: (configuration) => { this._registerConfiguration(configuration); },
            run: () => { this._runApp(); },
            getTopicValue: (topicName, key) => { return this._getTopicValue(topicName, key) },
            subscribeToTopic: (topicName) => { this._subscribeToTopic(topicName) },
            syncTopicUpdates: (id) => { return this._syncTopicUpdates(id) },
            hasTerminated: () => { return this._terminated; },
            callService: (serviceName, arg) => { return this._callService(serviceName, arg); }
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

  _registerActivity: function(activity)
  {
    this._activities.push(activity);
  },

  _registerConfiguration: function(configuration)
  {
    this._configurations.push(configuration);
  },

  _runApp: function()
  {
    Promise.all(this._configurations.map((config) => {
      return config();
    })).then(() => {
      this._activities.forEach((activity) => {
        setImmediate(activity);
      });
    });
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
        const pending = this._topicQPending;
        this._topicQPending = {};
        for (let id in pending)
        {
          pending[id]();
        }
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

  _syncTopicUpdates: function(id)
  {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        if (this._terminated)
        {
          reject(new Error('Terminated'));
        }
        else if (this._topicQ.length === 0)
        {
          if (this._noUpdates[id])
          {
            this._topicQPending[id] = () => {
              this._syncTopicUpdates(id).then(resolve, reject);
            }
          }
          else
          {
            this._noUpdates[id] = true;
            resolve();
          }
        }
        else
        {
          this._topicQ.forEach((event) => {
            Object.assign(this._topics[event.topic] || {}, event);
          });
          this._topicQ = [];
          for (let key in this._noUpdates)
          {
            this._noUpdates[key] = false;
          }
          this._noUpdates[id] = true;
          resolve();
        }
      });;
    });
  },

  _callService: function(service, arg)
  {
    if (!this._proxies[service])
    {
      this._proxies[service] = this._node.proxy({ service: service });
    }
    return this._proxies[service](arg);
  },

  _unproxyAllServices: function()
  {
    for (let service in this._proxies)
    {
      this._node.unproxy({ service: service });
    }
    this._proxies = {};
  }
};

module.exports = app;
