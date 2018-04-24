'use strict';

console.info('Loading 8-Bit Slave.');

const Root =
{
  _advertisers: {},
  _services: {},
  _subscribers: {},
  _proxies: {},

  _connection: null,
  _opened: false,
  _pending: [],

  event: function(msg, handler)
  {
    switch (msg.op)
    {
      case 'advertise':
      {
        this._advertisers[msg.topic] = handler;
        this.sendToMaster(msg);
        break;
      }
      case 'unadvertise':
      {
        const fn = this._advertisers[msg.topic];
        if (fn)
        {
          delete this._advertisers[msg.topic];
          fn(msg);
        }
        this.sendToMaster(msg);
        break;
      }
      case 'unadvertise-force':
      {
        const fn = this._advertisers[msg.topic];
        delete this._advertisers[msg.topic];
        fn && fn(msg);
        break;
      }
      case 'subscribe-req':
      {
        this._subscribers[msg.subscriber] = handler;
        if (msg.__fromMaster)
        {
          const fn = this._advertisers[msg.topic];
          fn && fn(msg);
        }
        else
        {
          this.sendToMaster(msg);
        }
        break;
      }
      case 'unsubscribe-req':
      {
        const fn = this._subscribers[msg.subscriber];
        delete this._subscribers[msg.subscriber];
        fn(msg);
        if (!msg.__fromMaster)
        {
          this.sendToMaster(msg);
        }
        break;
      }
      case 'subscribe-ack':
      case 'unsubscribe-ack':
      case 'unsubscribe-force':
      case 'topic':
      {
        const fn = this._subscribers[msg.subscriber];
        fn && fn(msg);
        break;
      }
      case 'service':
      {
        this._services[msg.service] = handler;
        this.sendToMaster(msg);
        break;
      }
      case 'unservice':
      {
        const fn = this._services[msg.service];
        if (fn)
        {
          delete this._services[msg.service];
          fn(msg);
          this.sendToMaster(msg);
        }
        break;
      }
      case 'unservice-force':
      {
        const fn = this._services[msg.service];
        delete this._services[msg.service];
        fn && fn(msg);
        break;
      }
      case 'connect-req':
      {
        this._proxies[msg.connector] = handler;
        if (msg.__fromMaster)
        {
          const fn = this._services[msg.service];
          fn && fn(msg);
        }
        else
        {
          this.sendToMaster(msg);
        }
        break;
      }
      case 'disconnect-req':
      {
        const fn = this._proxies[msg.connector];
        if (fn)
        {
          delete this._proxies[msg.connector];
          fn(msg);
        }
        if (!msg.__fromMaster)
        {
          this.sendToMaster(msg);
        }
        break;
      }
      case 'call':
      {
        if (msg.__fromMaster)
        {
          const fn = Root._services[msg.service];
          fn && fn(msg);
        }
        else
        {
          this.sendToMaster(msg);
        }
        break;
      }
      case 'connect-ack':
      case 'disconnect-ack':
      case 'disconnect-force':
      case 'reply':
      case 'exception':
      {
        const fn = this._proxies[msg.connector];
        fn && fn(msg);
        break;
      }
      default:
        throw new Error(JSON.stringify(msg));
    }
  },

  sendToMaster: function(msg)
  {
    if (msg.__fromMaster)
    {
      console.error('Message loop', JSON.stringify(msg));
    }
    else if (this._opened)
    {
      //console.log('->', JSON.stringify(msg));
      this._connection.send(JSON.stringify(msg));
    }
    else
    {
      this._pending.push(() => {
        this.sendToMaster(msg);
      });
    }
  }
};

if (typeof WebSocket === 'undefined')
{
  const websocket = require('websocket');
  global.WebSocket = function(url)
  {
    const client = websocket.client();
    client.on('connect', () => {
      this.onopen();
    });
    client.on('message', (message) => {
      this.onmessage({ data: message.utf8Data });
    });
    client.on('close', () => {
      this.onclose();
    });
    client.on('connectFailed', () => {
      this.onclose();
    });
    this.send = (data) => {
      this.sendUTF(data);
    }
    client.target(url);
  }
}

function runSlave(target)
{
  const connect = () =>
  {
    Root._connection = new WebSocket(target);
    Root._connection.onopen = () => {
      Root._opened = true;
      const pend = Root._pending;
      Root._pending = [];
      pend.forEach((fn) => {
        fn();
      });
    }
    Root._connection.onmessage = (message) =>
    {
      try
      {
        //console.log('<-', message.utf8Data);
        const msg = JSON.parse(message.data);
        msg.__fromMaster = true;
        switch (msg.op)
        {
          case 'connect-req':
          {
            const chandler = (msg) => {
              Root.sendToMaster(msg);
            }
            Root.event(msg, chandler);
            break;
          }
          case 'subscribe-req':
          {
            const shandler = (msg) => {
              Root.sendToMaster(msg);
            }
            Root.event(msg, shandler);
            break;
          }
          default:
            Root.event(msg, null);
            break;
        }
      }
      catch (e)
      {
        console.error(e);
      }
    }
    Root._connection.onclose = () =>
    {
      if (Root._opened)
      {
        Root._opened = false;
        Root._connection = null;
        const oldProxies = Root._proxies;
        const oldSubscribers = Root._subscribers;
        const oldServices = Root._services;
        const oldAdvertisers = Root._advertisers;
        Root._proxies = {};
        Root._subscribers = {};
        Root._services = {};
        Root._advertisers = {};
        for (let subscriber in oldSubscribers)
        {
          oldSubscribers[subscriber]({ timestamp: Date.now(), op: 'unsubscribe-force', subscriber: subscriber });
        }
        for (let proxy in oldProxies)
        {
          oldProxies[proxy]({ timestamp: Date.now(), op: 'disconnect-force', connector: proxy });
        }
        for (let topic in oldAdvertisers)
        {
          oldAdvertisers[topic]({ timestamp: Date.now(), op: 'unadvertise-force', topic: topic });
        }
        for (let service in oldServices)
        {
          oldServices[service]({ timestamp: Date.now(), op: 'unservice-force', service: service });
        }
        connect();
      }
      else
      {
        setTimeout(connect, 1000);
      }
    }
  }
  connect();
}

function Slave(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._target = `ws://${config.target}/8BitApiV1`
}

Slave.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      runSlave(this._target);
    }
    return this;
  },

  disable: function()
  {
    this._enabled--;
    return this;
  }
};

if (typeof process === 'object')
{
  global['8Bit'] = Root;
  module.exports = Slave;
}
else
{
  window['8Bit'] = Root;
  runSlave(`ws://${window.location.host}/8BitApiV1`);
}
