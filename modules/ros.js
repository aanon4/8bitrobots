'use strict';

console.info('Loading ROS API.');

var emitter;
var UUID;
if (typeof process === 'object')
{
  const EventEmitter = require('events');
  UUID = require('uuid/v4');
  emitter = new EventEmitter();
  emitter.setMaxListeners(50);
  global.__rosEmitter = emitter;
}
else
{
  UUID = function()
  {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };
  emitter = window.rosEmitter;
}

let rosNodes = {};

function rosNodeInternal(name)
{
  this._name = name;
  this._subscribers = {};
  this._advertisers = {};
  this._services = {};
  this._proxies = {};
}

rosNodeInternal.prototype = 
{
  subscribe: function(options, callback)
  {
    const topic = this.resolveName(options.topic);
    if (topic in this._subscribers)
    {
      throw new Error();
    }
    const uuid = this.resolveName(`~${UUID()}`);
    const subscriber = (event) =>
    {
      emitter.removeListener(uuid, subscriber);
      if (event.latched)
      {
        callback(event.latched);
      }
    }
    this._subscribers[topic] = () =>
    {
      emitter.removeListener(topic, callback);
      emitter.removeListener(uuid, subscriber);
      delete this._subscribers[topic];
    }
    emitter.addListener(topic, callback);
    emitter.addListener(uuid, subscriber);
    emitter.emit(`${topic}/__subscribe`, { timestamp: Date.now(), subscriber: uuid });
  },

  unsubscribe: function(options)
  {
    let fn = this._subscribers[this.resolveName(options.topic)];
    fn && fn();
  },

  advertise: function(options)
  {
    let topic = this.resolveName(options.topic);

    console.info(` +${topic}`);

    if (topic in this._advertisers)
    {
      throw new Error(`Duplicate advert ${topic}`);
    }
    var latched = null;
    let advertiser = (event) =>
    {
      emitter.emit(event.subscriber, { timestamp: Date.now(), latched: latched });
    }
    if (options.latching || !('latching' in options)) // latching by default
    {
      emitter.addListener(`${topic}/__subscribe`, advertiser);
      this._advertisers[topic] = () =>
      {
        emitter.removeListener(`${topic}/__subscribe`, advertiser);
        delete this._advertisers[topic];
      }
    }
    return {
      publish: function(msg)
      {
        let event = Object.assign({ timestamp: Date.now(), topic: topic }, msg);
        latched = event;
        emitter.emit(topic, event);
      }
    }
  },

  unadvertise: function(options)
  {
    const topic = this.resolveName(options.topic);

    console.info(` -${topic}`);

    const fn = this._advertisers[topic];
    fn && fn();
  },

  service: function(options, fn)
  {
    const service = this.resolveName(options.service);

    console.info(` +${service}`);

    if (service in this._services)
    {
      throw new Error(`Duplicate service ${service}`);
    }
    const serviceHandler = (request) =>
    {
      const id = request.id;
      try
      {
        Promise.resolve(fn(request)).then((reply) =>
        {
          if (id)
          {
            emitter.emit(id.uuid, Object.assign({ id: id, timestamp: Date.now() }, reply));
          }
        });
      }
      catch (e)
      {
        if (id)
        {
          emitter.emit(id.uuid, { id: id, timestamp: Date.now(), __exception: e });
        }
      }
    }
    emitter.addListener(service, serviceHandler);

    const connectHandler = (event) =>
    {
      if (event.available === null)
      {
        emitter.emit(`${service}/__connect`, { timestamp: Date.now(), available: true });
      }
    }
    this._services[service] = () =>
    {
      emitter.removeListener(service, serviceHandler);
      emitter.removeListener(`${service}/__connect`, connectHandler);
      delete this._services[service];
    }
    emitter.addListener(`${service}/__connect`, connectHandler);
    emitter.emit(`${service}/__connect`, { timestamp: Date.now(), available: true });
  },

  unservice: function(options)
  {
    const service = this.resolveName(options.service);

    console.info(` -${service}`);

    const fn = this._services[service];
    fn && fn();
  },

  proxy: function(options)
  {
    const service = this.resolveName(options.service);
    if (service in this._proxies)
    {
      throw new Error();
    }
  
    const pending = {};
    const replyHandler = (reply) =>
    {
      pending[reply.id.i](reply);
    }
    const uuid = this.resolveName(`~${UUID()}`);
    emitter.addListener(uuid, replyHandler);

    let waitCallbacks = [];
    let iteration = 0;
    const fn = function(request)
    {
      let i = ++iteration;
      return new Promise((resolve, reject) =>
      {
        pending[i] = (reply) =>
        {
          delete pending[reply.id.i];
          if (reply.__exception)
          {
            reject(reply.__exception);
          }
          else
          {
            resolve(reply);
          }
        }
        let event = Object.assign({ id: { uuid: uuid, i: i }, timestamp: Date.now() }, request)
        if (waitCallbacks === null)
        {
          emitter.emit(service, event);
        }
        else
        {
          fn.wait(() =>
          {
            emitter.emit(service, event);
          });
        }
      });
    };

    const availableHandler = (event) =>
    {
      if (event.available === true)
      {
        emitter.removeListener(`${service}/__connect`, availableHandler);
        const callbacks = waitCallbacks;
        waitCallbacks = null;
        callbacks.forEach((callback) =>
        {
          callback();
        });
      }
    }
    emitter.addListener(`${service}/__connect`, availableHandler);

    fn.wait = (callback) =>
    {
      if (waitCallbacks === null)
      {
        callback(n);
      }
      else
      {
        waitCallbacks.push(callback);
        emitter.emit(`${service}/__connect`, { timestamp: Date.now(), available: null });
      }
    }

    this._proxies[service] = () =>
    {
      emitter.removeListener(uuid, replyHandler);
      emitter.removeListener(`${service}/__connect`, availableHandler);
      for (var key in pending)
      {
        delete pending[key];
      }
      delete this._proxies[service];
    }
  
    return fn;
  },

  unproxy: function(options)
  {
    const fn = this._proxies[this.resolveName(options.service)];
    fn && fn();
  },

  resolveName: function(name)
  {
    if (name === '*')
    {
      return '*';
    }
    else if (name[0] === '/')
    {
      return name;
    }
    else if (name[0] === '~')
    {
      return this._name + '/' + name.substring(1);
    }
    else
    {
      return this._name.split('/').slice(0, -1).join('/') + '/' + name;
    }
  }
};

var rosNodeWrapper =
{
  init: function(name)
  {
    let node = new rosNodeInternal(name);
    rosNodes[name] = node;
    return node;
  }
};

if (typeof process === 'object')
{
  global.rosNode = rosNodeWrapper;
}
else
{
  window.rosNode = rosNodeWrapper;
}
