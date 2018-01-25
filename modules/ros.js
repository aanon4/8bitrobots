'use strict';

console.info('Loading ROS API.');

let root;
const UUID = function()
{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};
if (typeof process === 'object')
{
  root = () => {
    return global.rosRoot;
  }
}
else
{
  root = () => {
    return window.rosRoot;
  }
}

const rosNodes = {};

function rosNodeInternal(name)
{
  this._name = name;
  this._subscribers = {};
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

    const listener = (msg) => {
      switch (msg.op)
      {
        case 'subscribed':
          break;

        case 'unsubscribed':
          root().subscribe(uuid, listener, topic, { timestamp: Date.now(), op: 'subscribe', topic: topic, subscriber: uuid });
          break;

        case 'topic':
          callback(msg.event);
          break;

        default:
          break;
      }
    }
    listener.remove = () => {
      root().publish(topic, { timestamp: Date.now(), op: 'unsubscribe', subscriber: uuid });
      delete this._subscribers[topic];
    }
    this._subscribers[topic] = uuid;
  
    root().subscribe(uuid, listener, topic, { timestamp: Date.now(), op: 'subscribe', topic: topic, subscriber: uuid });
  },

  unsubscribe: function(options)
  {
    root().unsubscribe(this._subscribers[this.resolveName(options.topic)]);
  },

  advertise: function(options)
  {
    let topic = this.resolveName(options.topic);

    console.info(` +${topic}`);

    let latched = null;
    const subscribers = [];
    const advertiser = (msg) => {
      switch (msg.op)
      {
        case 'subscribe':
          subscribers.push(msg.subscriber);
          root().publish(msg.subscriber, { timestamp: Date.now(), op: 'subscribed', subscriber: msg.subscriber });
          if (latched)
          {
            root().publish(msg.subscriber, { timestamp: Date.now(), op: 'topic', subscriber: msg.subscriber, event: latched });
          }
          break;

        case 'unsubscribe':
          const idx = subscribers.indexOf(msg.subscriber);
          if (idx !== -1)
          {
            subscribers.splice(idx, 1);
          }
          break;

        default:
          break;
      }
    }
    advertiser.remove = () => {
      subscribers.forEach((subscriber) => {
        root().publish(subscriber, { timestamp: Date.now(), op: 'unsubscribed', subscriber: subscriber });
      });
    }
    root().advertise(topic, advertiser);

    let latching = ('latching' in options) ? options.latching : true;
    return {
      publish: function(event)
      {
        if (latching)
        {
          latched = event;
        }
        subscribers.forEach((subscriber) => {
          root().publish(subscriber, { timestamp: Date.now(), op: 'topic', subscriber: subscriber, topic: topic, event: event });
        });
      }
    }
  },

  unadvertise: function(options)
  {
    const topic = this.resolveName(options.topic);

    console.info(` -${topic}`);

    root().unadvertise(topic);
  },

  service: function(options, fn)
  {
    const service = this.resolveName(options.service);

    console.info(` +${service}`);
  
    const proxies = [];
    const serviceHandler = (msg) =>
    {
      switch (msg.op)
      {
        case 'call':
          Promise.resolve(fn(msg.call)).then((reply) => {
            root().reply(msg.caller, { timestamp: Date.now(), op: 'reply', caller: msg.caller, replyid: msg.replyid, reply: reply });
          }).catch((e) => {
            root().reply(msg.caller, { timestamp: Date.now(), op: 'exception', caller: msg.caller, replyid: msg.replyid, exception: e });
          });
          break;

        case 'connect':
          proxies.push(msg.connector);
          root().reply(msg.connector, { timestamp: Date.now(), op: 'connected', connector: msg.connector });
          break;

        case 'disconnect':
          const idx = proxies.indexOf(msg.disconnector);
          if (idx !== -1)
          {
            proxies.splice(idx, 1);
          }
          break;

        default:
          break;
      }
    }
    serviceHandler.remove = () => {
      proxies.forEach((proxy) => {
        root().reply(proxy, { timestamp: Date.now(), op: 'disconnected', connector: proxy });
      });
    }
    root().service(service, serviceHandler);
  },

  unservice: function(options)
  {
    const service = this.resolveName(options.service);

    console.info(` -${service}`);

    root().unservice(service);
  },

  proxy: function(options)
  {
    const service = this.resolveName(options.service);
    if (service in this._proxies)
    {
      throw new Error();
    }
  
    const uuid = this.resolveName(`~${UUID()}`);

    let waiting = [];
    const pending = {};
    let replyid = 0;
    const replyHandler = (msg) =>
    {
      const pend = pending[msg.replyid];
      if (pend)
      {
        delete pending[msg.replyid];
      }
      switch (msg.op)
      {
        case 'connected':
          const waited = waiting;
          waiting = null;
          waited.forEach((wait) => {
            wait();
          });
          break;

        case 'disconnected':
          waiting = [];
          root().connect(uuid, replyHandler, service, { timestamp: Date.now(), op: 'connect', service: service, connector: uuid });
          break;
    
        case 'reply':
          pend && pend(msg.reply, null);
          break;

        case 'exception':
          pend && pend(null, msg.exception);
          break;

        default:
          break;
      }
    }
    
    replyHandler.remove = () => {
      root().call(service, { timestamp: Date.now(), op: 'disconnect', connector: uuid });
      delete this._proxies[service];
    }

    this._proxies[service] = uuid;

    root().connect(uuid, replyHandler, service, { timestamp: Date.now(), op: 'connect', service: service, connector: uuid });

    return (request) => {
      const rid = ++replyid;
      return new Promise((resolve, reject) => {
        pending[rid] = (reply, exception) => {
          if (exception)
          {
            reject(exception);
          }
          else
          {
            resolve(reply);
          }
        }
        if (waiting === null)
        {
          root().call(service, { timestamp: Date.now(), op: 'call', service: service, caller: uuid, replyid: rid, call: request } );
        }
        else
        {
          waiting.push(() => {
            root().call(service, { timestamp: Date.now(), op: 'call', service: service, caller: uuid, replyid: rid, call: request } );
          });
        }
      });
    }
  },

  unproxy: function(options)
  {
    root().disconnect(this._subscribers[this.resolveName(options.service)]);
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
