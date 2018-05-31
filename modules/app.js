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
    this._activitiesPending = {};
    this._services = {};
    this._setups = [];
    this._activities = [];
    this._configurations = [];
    this._heartbeatTimers = {};
    this._parts = {};
    try
    {
      //console.log('Deploying code', this._config.get('code'));
      const code = this._config.get('code');
      VM.runInNewContext(
        code,
        {
          App:
          {
            registerSetup: (setup) => { this._registerSetup(setup); },
            registerActivity: (activityId, fn) => { this._registerActivity(activityId, fn); },
            registerConfiguration: (configuration) => { this._registerConfiguration(configuration); },
            run: () => { this._runApp(); },
            subscribe: (activity, topicName, heartbeat) => { this._subscribeToTopic(activity, topicName, heartbeat); },
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
    this._unsubscribeAllTopic();
    this._disableAllHeartbeats();
    const pending = this._activitiesPending;
    this._activitiesPending = {};
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
    const activity =
    {
      service: (serviceName) => { return this._getService(serviceName); },
      print: (msg) => { this._debugMessage(msg); }
    };
    this._setups.push(() => {
      setup(activity);
    });
  },

  _registerActivity: function(activityId, fn)
  {
    const activity =
    {
      sync: () => { return this._syncTopicUpdates(activityId); },
      get: (topicName) => { return this._getTopic(activityId, topicName); },
      service: (serviceName) => { return this._getService(serviceName); },
      part: (partName, instanceName) => { return this._getPart(partName, instanceName); },
      print: (msg) => { this._debugMessage(msg); },
      terminated: () => { return !(activityId in this._activitiesPending); }
    };
    this._activitiesPending[activityId] = null;
    this._activities.push(async () => {
      await fn(activity);
      delete this._activitiesPending[activityId];
    });
  },

  _registerConfiguration: function(configuration)
  {
    const activity =
    {
      service: (serviceName) => { return this._getService(serviceName); }
    };
    this._configurations.push(() => {
      configuration(activity);
    });
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

  _getTopic: function(activityId, topicName)
  {
    if (activityId)
    {
      const topic = this._topics[topicName];
      if (topic)
      {
        const ainfo = topic.activities[activity];
        if (ainfo)
        {
          ainfo.state.__heartbeat = (Date.now() - topic.heartbeat) / 1000;
          return ainfo.state;
        }
      }
    }
    return {};
  },

  _subscribeToTopic: function(activity, topicName, heartbeat)
  {
    if (!activity)
    {
      return;
    }
    else if (!this._topics[topicName])
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
          const callback = this._activitiesPending[id];
          if (callback)
          {
            this._activitiesPending[id] = null;
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

  _syncTopicUpdates: function(id)
  {
    return new Promise((resolve) => {
      setImmediate(() => {
        if (!(id in this._activitiesPending))
        {
          resolve(false);
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
            resolve(true);
          }
          else
          {
            this._activitiesPending[id] = () => {
              this._syncTopicUpdates(id).then(resolve);
            }
          }
        }
      });
    });
  },

  _getService: function(service)
  {
    if (!this._proxies[service])
    {
      this._proxies[service] = this._node.proxy({ service: service });
    }
    return this._proxies[service];
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

  _getPart: function(partName, instanceName)
  {
    const id = `${partName}/${instanceName}`;
    let part = this._parts[id];
    if (!part)
    {
      try
      {
        part = require(`./parts/${partName}`)(instanceName);
      }
      catch (_)
      {
        console.error(`Missing App Part: ${partName}`);
        return null;
      }
      this._parts[id] = part;
    }
    return part;
  },

  _enableHeartbeat: function(activity, topicName, heartbeat)
  {
    const id = `${activity}/${topicName}`;
    if (!this._heartbeatTimers[id])
    {
      this._heartbeatTimers[id] = setInterval(() => {
        this._topics[topicName].activities[activity].version--;
        const callback = this._activitiesPending[activity];
        if (callback)
        {
          this._activitiesPending[activity] = null;
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
