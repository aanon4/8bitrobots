'use strict';

console.info('Loading 8-Bit API.');

let nodeEvent;
const UUID = function()
{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};
if (typeof process === 'object')
{
  nodeEvent = (msg, handler) => {
    return global['8Bit'].event(msg, handler);
  }
}
else
{
  nodeEvent = (msg, handler) => {
    return window['8Bit'].event(msg, handler);
  }
}

const nodes = {};

function nodeInternal(name)
{
  this._name = name;
  this._subscribers = {};
  this._proxies = {};
}

nodeInternal.prototype = 
{
  subscribe: function(options, callback)
  {
    const topic = this.resolveName(options.topic);
    if (topic in this._subscribers)
    {
      this._subscribers[topic].count++;
      this._subscribers[topic].callbacks.push(callback);
    }
    else
    {
      const uuid = this.resolveName(`~${UUID()}`);

      const listener = (msg) => {
        switch (msg.op)
        {
          case 'unsubscribe-req':
            delete this._subscribers[topic];
            break;

          case 'unsubscribe-force':
            nodeEvent({ timestamp: Date.now(), op: 'subscribe-req', topic: topic, subscriber: uuid }, listener);
            break;

          case 'topic':
            if (this._subscribers[topic])
            {
              this._subscribers[topic].callbacks.forEach((fn) => {
                fn(msg.event);
              });
            }
            break;

          default:
            break;
        }
      }

      this._subscribers[topic] = { uuid: uuid, count: 1, callbacks: [ callback ] };
    
      nodeEvent({ timestamp: Date.now(), op: 'subscribe-req', topic: topic, subscriber: uuid }, listener);
    }
  },

  unsubscribe: function(options)
  {
    const topic = this.resolveName(options.topic);
    if (--this._subscribers[topic].count === 0)
    {
      const uuid = this._subscribers[topic].uuid;
      nodeEvent({ timestamp: Date.now(), op: 'unsubscribe-req', topic: topic, subscriber: uuid });
    }
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
          nodeEvent({ timestamp: Date.now(), op: 'subscribe-ack', subscriber: msg.subscriber });
          if (latched)
          {
            nodeEvent({ timestamp: Date.now(), op: 'topic', subscriber: msg.subscriber, event: latched });
          }
          break;

        case 'unsubscribe-req':
          const idx = subscribers.indexOf(msg.subscriber);
          if (idx !== -1)
          {
            subscribers.splice(idx, 1);
          }
          nodeEvent({ timestamp: Date.now(), op: 'unsubscribe-ack', subscriber: msg.subscriber });
          break;

        case 'unadvertise':
          subscribers.forEach((subscriber) => {
            nodeEvent({ timestamp: Date.now(), op: 'unsubscribe-force', subscriber: subscriber });
          });
          break;

        case 'unadvertise-force':
          nodeEvent({ timestamp: Date.now(), op: 'advertise', topic: topic, schema: options.schema, friendlyName: options.friendlyName }, advertiser);
          break;

        default:
          break;
      }
    }

    nodeEvent({ timestamp: Date.now(), op: 'advertise', topic: topic, schema: options.schema, friendlyName: options.friendlyName }, advertiser);

    let latching = ('latching' in options) ? options.latching : true;
    return {
      publish: function(event)
      {
        if (latching)
        {
          latched = event;
        }
        subscribers.forEach((subscriber) => {
          nodeEvent({ timestamp: Date.now(), op: 'topic', subscriber: subscriber, topic: topic, event: event });
        });
      }
    }
  },

  unadvertise: function(options)
  {
    const topic = this.resolveName(options.topic);

    console.info(` -${topic}`);

    nodeEvent({ timestamp: Date.now(), op: 'unadvertise', topic: topic });
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
            nodeEvent({ timestamp: Date.now(), op: 'reply', connector: msg.connector, replyid: msg.replyid, reply: reply });
          }).catch((e) => {
            nodeEvent({ timestamp: Date.now(), op: 'exception', connector: msg.connector, replyid: msg.replyid, exception: e });
          });
          break;

        case 'connect-req':
          proxies.push(msg.connector);
          nodeEvent({ timestamp: Date.now(), op: 'connect-ack', connector: msg.connector });
          break;

        case 'disconnect-req':
          const idx = proxies.indexOf(msg.connector);
          if (idx !== -1)
          {
            proxies.splice(idx, 1);
          }
          nodeEvent({ timestamp: Date.now(), op: 'disconnect-ack', connector: msg.connector });
          break;

        case 'unservice':
          proxies.forEach((proxy) => {
            nodeEvent({ timestamp: Date.now(), op: 'disconnect-force', connector: proxy });
          });
          break;

        case 'unservice-force':
          nodeEvent({ timestamp: Date.now(), op: 'service', service: service, schema: options.schema, friendlyName: options.friendlyName }, serviceHandler);
          break;

        default:
          break;
      }
    }

    nodeEvent({ timestamp: Date.now(), op: 'service', service: service, schema: options.schema, friendlyName: options.friendlyName }, serviceHandler);
  },

  unservice: function(options)
  {
    const service = this.resolveName(options.service);

    console.info(` -${service}`);

    nodeEvent({ timestamp: Date.now(), op: 'unservice', service: service });
  },

  proxy: function(options)
  {
    const service = this.resolveName(options.service);
    if (service in this._proxies)
    {
      this._proxies[service].count++;
    }
    else
    {
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

          case 'disconnect-req':
            delete this._proxies[service];
            break;

          case 'disconnect-force':
            waiting = [];
            nodeEvent({ timestamp: Date.now(), op: 'connect-req', service: service, connector: uuid }, replyHandler);
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

      this._proxies[service] =
      {
        uuid: uuid,
        count: 1,
        fn: (request) => {
          if (!(service in this._proxies))
          {
            throw new Error(`Not connected: ${service}`);
          }
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
              nodeEvent({ timestamp: Date.now(), op: 'call', service: service, connector: uuid, replyid: rid, call: request } );
            }
            else
            {
              waiting.push(() => {
                nodeEvent({ timestamp: Date.now(), op: 'call', service: service, connector: uuid, replyid: rid, call: request } );
              });
            }
          });
        }
      };

      nodeEvent({ timestamp: Date.now(), op: 'connect-req', service: service, connector: uuid }, replyHandler);
    }
  
    return this._proxies[service].fn;
  },

  unproxy: function(options)
  {
    const service = this.resolveName(options.service);
    if (--this._proxies[service].count === 0)
    {
      const uuid = this._proxies[service].uuid;
      nodeEvent({ timestamp: Date.now(), op: 'disconnect-req', service: service, connector: uuid });
    }
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

var nodeWrapper =
{
  init: function(name)
  {
    let node = new nodeInternal(name);
    nodes[name] = node;
    return node;
  }
};

if (typeof process === 'object')
{
  global.Node = nodeWrapper;
}
else
{
  window.Node = nodeWrapper;
}
