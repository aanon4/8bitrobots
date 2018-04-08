'use strict';

console.info('Loading 8-Bit Slave.');

const websocket = require('websocket');

const Root =
{
  _advertisers: {},
  _services: {},
  _subscribers: {},
  _proxies: {},

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
        delete this._advertisers[msg.topic];
        fn.remove();
        this.sendToMaster(msg);
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
        fn.remove();
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
        delete this._services[msg.service];
        fn.remove();
        this.sendToMaster(msg);
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
        delete this._proxies[msg.connector];
        fn.remove();
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
    (this._tmpQ || (this._tmpQ = [])).push(msg);
  }
};
global['8Bit'] = Root;

function runSlave(target)
{
  let connection = null;
  let pending = [];

  function send(msg)
  {
    msg = JSON.stringify(msg);
    const doSend = () =>
    {
      if (connection)
      {
        //console.log('->', msg);
        connection.sendUTF(msg);
      }
      else
      {
        pending.push(doSend);
      }
    }
    doSend();
  }

  Root.sendToMaster = (msg) => {
    if (msg.__fromMaster)
    {
      console.error('Message loop', JSON.stringify(msg));
    }
    else
    {
      send(msg);
    }
  }

  (Root._tmpQ || []).forEach((msg) => {
    Root.sendToMaster(msg);
  });
  delete Root._tmpQ;

  const websocketclient = new websocket.client();

  function reconnect()
  {
    setTimeout(() =>
    {
      connection = null;
      websocketclient.connect(target);
    }, 1000);
  }

  websocketclient.on('connect', (conn) =>
  {
    connection = conn;

    const pend = pending;
    pending = [];
    pend.forEach((fn) => {
      fn();
    });

    connection.on('message', (message) =>
    {
      if (message.type === 'utf8')
      {
        try
        {
          //console.log('<-', message.utf8Data);
          const msg = JSON.parse(message.utf8Data);
          msg.__fromMaster = true;
          switch (msg.op)
          {
            case 'connect-req':
            {
              const chandler = (msg) => {
                Root.sendToMaster(msg);
              }
              chandler.remove = () => {
              }
              Root.event(msg, chandler);
              break;
            }
            case 'subscribe-req':
            {
              const shandler = (msg) => {
                Root.sendToMaster(msg);
              }
              shandler.remove = () => {
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
    });
    connection.on('close', () =>
    {
      connection = null;
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
        oldAdvertisers[topic]({ timestamp: Date.now(), op: 'unadvertise', topic: topic });
      }
      for (let service in oldServices)
      {
        oldServices[service]({ timestamp: Date.now(), op: 'unservice', service: service });
      }
      reconnect();
    });

  });
  websocketclient.on('connectFailed', () =>
  {
    reconnect();
  });
  websocketclient.connect(target);
};

function Slave(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._target = `ws://${config.target}:80/8BitApiV1`
}

Slave.prototype =
{
  enable: function()
  {
    runSlave(this._target);

    return this;
  },

  disable: function()
  {
    return this;
  }
};

module.exports = Slave;
