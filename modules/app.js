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
    this._proxies = {};
    this._topics = {};
    this._topicQ = [];
    this._topicQPending = {};
    this._services = {};
    this._setups = [];
    this._activities = [];
    this._configurations = [];
    this._status = { terminated: false };
    this._heartbeatTimers = {};
    try
    {
      console.log('Deploying code', this._config.get('code'));
      const code = this._config.get('code');
      VM.runInNewContext(
        code,
        {
          App:
          {
            registerSetup: (setup) => { this._registerSetup(setup); },
            registerActivity: (activity) => { this._registerActivity(activity); },
            registerConfiguration: (configuration) => { this._registerConfiguration(configuration); },
            run: () => { this._runApp(); },
            get: (activity, topicName, key) => { return this._getTopicValue(activity, topicName, key); },
            subscribe: (activity, topicName, heartbeat) => { this._subscribeToTopic(activity, topicName, heartbeat); },
            sync: (activity, status) => { return this._syncTopicUpdates(activity, status); },
            status: () => { return this._status; },
            call: (serviceName, arg) => { return this._callService(serviceName, arg); },
            part: (partName, arg) => { return this._callPart(partName, arg); },
            print: (msg) => { this._debugMessage(msg); }
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
    this._status.terminated = true;
    this._unsubscribeAllTopic();
    this._disableAllHeartbeats();
    const pending = this._topicQPending;
    this._topicQPending = {};
    for (let id in pending)
    {
      pending[id]();
    }
  },

  reconfigure: function(changes)
  {
    if (this._enabled && changes.code)
    {
      this._disable();
      this._enable();
    }
  },

  _registerSetup: function(setup)
  {
    this._setups.push(setup);
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
      return Promise.all(this._setups.map((setup) => {
        return setup();
      }));
    }).then(() => {
      this._activities.forEach((activity) => {
        setImmediate(activity);
      });
    });
  },

  _getTopicValue: function(activity, topicName, key)
  {
    const topic = this._topics[topicName];
    if (topic)
    {
      if (key === '__heartbeat')
      {
        return (Date.now() - topic.heartbeat) / 1000;
      }
      const ainfo = topic.activities[activity];
      if (ainfo)
      {
        return ainfo.state[key];
      }
    }
    return undefined;
  },

  _subscribeToTopic: function(activity, topicName, heartbeat)
  {
    if (!this._topics[topicName])
    {
      const info =
      {
        activities:
        {
          [activity]: { state: {}, callback: null, version: 0 }
        },
        state: {},
        heartbeat: Date.now(),
        version: 1
      };
      this._topics[topicName] = info;
    
      this._node.subscribe({ topic: topicName }, (event) => {
        Object.assign(info.state, event);
        info.heartbeat = Date.now();
        info.version++;
        for (let id in info.activities)
        {
          const callback = this._topicQPending[id];
          if (callback)
          {
            this._topicQPending[id] = null;
            callback();
          }
        }
      });
    }
    else
    {
      this._topics[topicName].activities[activity] = { state: {}, callback: null, version: 0 };
    }
    if (heartbeat)
    {
      this._enableHeartbeat(activity, topicName, heartbeat);
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

  _syncTopicUpdates: function(id, status)
  {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        if (status.terminated)
        {
          reject(new Error('Terminated'));
        }
        else
        {
          let success = false;
          for (let topicName in this._topics)
          {
            const topic = this._topics[topicName];
            const activity = topic.activities[id];
            if (activity && activity.version != topic.version)
            {
              Object.assign(activity.state, topic.state);
              activity.version = topic.version;
              success = true;
            }
          }
          if (success)
          {
            resolve();
          }
          else
          {
            this._topicQPending[id] = () => {
              this._syncTopicUpdates(id, status).then(resolve, reject);
            }
          }
        }
      });
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
  },

  _debugMessage: function(msg)
  {
    console.log(msg);
  },

  _callPart: function(name, arg)
  {
    try
    {
      return require(`./parts/${name}`)(arg);
    }
    catch (_)
    {
      console.error(`Missing App Part: ${name}`);
      return 0;
    }
  },

  _enableHeartbeat: function(activity, topicName, heartbeat)
  {
    const id = `${activity}/${topicName}`;
    if (!this._heartbeatTimers[id])
    {
      this._heartbeatTimers[id] = setInterval(() => {
        this._topics[topicName].activities[activity].version--;
        const callback = this._topicQPending[activity];
        if (callback)
        {
          this._topicQPending[activity] = null;
          callback();
        }
      }, heartbeat);
    }
  },

  _disableAllHeartbeats: function()
  {
    for (let id in this._heartbeatTimers)
    {
      clearInterval(this._heartbeatTimers[id]);
    }
    this._heartbeatTimers = {};
  }
};

module.exports = app;
