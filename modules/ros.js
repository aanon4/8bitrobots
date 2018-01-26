'use strict';

console.info('Loading ROS API.');

let rosEvent;
const UUID = function()
{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};
if (typeof process === 'object')
{
  rosEvent = (msg, handler) => {
    return global.rosRoot.event(msg, handler);
  }
}
else
{
  rosEvent = (msg, handler) => {
    return window.rosRoot.event(msg, handler);
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
        case 'unsubscribe-force':
          rosEvent({ timestamp: Date.now(), op: 'subscribe-req', topic: topic, subscriber: uuid }, listener);
          break;

        case 'topic':
          callback(msg.event);
          break;

        default:
          break;
      }
    }
    listener.remove = () => {
      delete this._subscribers[topic];
    }
    this._subscribers[topic] = uuid;
  
    rosEvent({ timestamp: Date.now(), op: 'subscribe-req', topic: topic, subscriber: uuid }, listener);
  },

  unsubscribe: function(options)
  {
    const topic = this.resolveName(options.topic);
    const uuid = this._subscribers[topic];
    rosEvent({ timestamp: Date.now(), op: 'unsubscribe-req', topic: topic, subscriber: uuid });
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
        case 'subscribe-req':
          subscribers.push(msg.subscriber);
          rosEvent({ timestamp: Date.now(), op: 'subscribe-ack', subscriber: msg.subscriber });
          if (latched)
          {
            rosEvent({ timestamp: Date.now(), op: 'topic', subscriber: msg.subscriber, event: latched });
          }
          break;

        case 'unsubscribe-req':
          const idx = subscribers.indexOf(msg.subscriber);
          if (idx !== -1)
          {
            subscribers.splice(idx, 1);
          }
          rosEvent({ timestamp: Date.now(), op: 'unsubscribe-ack', subscriber: msg.subscriber });
          break;

        default:
          break;
      }
    }
    advertiser.remove = () => {
      subscribers.forEach((subscriber) => {
        rosEvent({ timestamp: Date.now(), op: 'unsubscribe-force', subscriber: subscriber });
      });
    }
    rosEvent({ timestamp: Date.now(), op: 'advertise', topic: topic }, advertiser);

    let latching = ('latching' in options) ? options.latching : true;
    return {
      publish: function(event)
      {
        if (latching)
        {
          latched = event;
        }
        subscribers.forEach((subscriber) => {
          rosEvent({ timestamp: Date.now(), op: 'topic', subscriber: subscriber, topic: topic, event: event });
        });
      }
    }
  },

  unadvertise: function(options)
  {
    const topic = this.resolveName(options.topic);

    console.info(` -${topic}`);

    rosEvent({ timestamp: Date.now(), op: 'unadvertise', topic: topic });
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
            rosEvent({ timestamp: Date.now(), op: 'reply', caller: msg.caller, replyid: msg.replyid, reply: reply });
          }).catch((e) => {
            rosEvent({ timestamp: Date.now(), op: 'exception', caller: msg.caller, replyid: msg.replyid, exception: e });
          });
          break;

        case 'connect-req':
          proxies.push(msg.connector);
          rosEvent({ timestamp: Date.now(), op: 'connect-ack', connector: msg.connector });
          break;

        case 'disconnect-req':
          const idx = proxies.indexOf(msg.connector);
          if (idx !== -1)
          {
            proxies.splice(idx, 1);
          }
          rosEvent({ timestamp: Date.now(), op: 'disconnect-ack', connector: msg.connector });
          break;

        default:
          break;
      }
    }
    serviceHandler.remove = () => {
      proxies.forEach((proxy) => {
        rosEvent({ timestamp: Date.now(), op: 'disconnect-force', connector: proxy });
      });
    }
    rosEvent({ timestamp: Date.now(), op: 'service', service: service }, serviceHandler);
  },

  unservice: function(options)
  {
    const service = this.resolveName(options.service);

    console.info(` -${service}`);

    rosEvent({ timestamp: Date.now(), op: 'unservice', service: service });
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
        case 'connect-ack':
          const waited = waiting;
          waiting = null;
          waited.forEach((wait) => {
            wait();
          });
          break;

        case 'disconnect-force':
          waiting = [];
          rosEvent({ timestamp: Date.now(), op: 'connect-req', service: service, connector: uuid }, replyHandler);
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
      delete this._proxies[service];
    }

    this._proxies[service] = uuid;

    rosEvent({ timestamp: Date.now(), op: 'connect-req', service: service, connector: uuid }, replyHandler);

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
          rosEvent({ timestamp: Date.now(), op: 'call', service: service, caller: uuid, replyid: rid, call: request } );
        }
        else
        {
          waiting.push(() => {
            rosEvent({ timestamp: Date.now(), op: 'call', service: service, caller: uuid, replyid: rid, call: request } );
          });
        }
      });
    }
  },

  unproxy: function(options)
  {
    const uuid = this._subscribers[this.resolveName(options.service)];
    rosEvent({ timestamp: Date.now(), op: 'disconnect-req', connector: uuid });
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
