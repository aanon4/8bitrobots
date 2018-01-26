'use strict';

console.info('Loading Slave ROS.');

const websocket = require('websocket');
const UUID = require('uuid/v4');

const TOPIC_SHUTDOWN = { topic: '/health/shutdown' };

global.rosRoot =
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
        this.sendToMaster(msg);
        break;
      }
      case 'unsubscribe-req':
      {
        const fn = this._subscribers[msg.subscriber];
        delete this._subscribers[msg.subscriber];
        fn.remove();
        this.sendToMaster(msg);
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
        this.sendToMaster(msg);
        break;
      }
      case 'disconnect-req':
      {
        const fn = this._proxies[msg.connector];
        delete this._proxies[msg.connector];
        fn.remove();
        this.sendToMaster(msg);
        break;
      }
      case 'call':
      {
        this.sendToMaster(msg);
        break;
      }
      case 'connect-ack':
      case 'disconnect-ack':
      case 'disconnect-force':
      {
        const fn = this._proxies[msg.connector];
        fn && fn(msg);
        break;
      }
      case 'reply':
      case 'exception':
      {
        const fn = this._proxies[msg.caller];
        fn && fn(msg);
        break;
      }
      default:
        throw new Error(JSON.stringify(msg));
    }
  }
};

function runSlave(target)
{
  const id = UUID();

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

  rosRoot.sendToMaster = (msg) => {
    send(msg);
  }

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
          rosRoot.event(JSON.parse(message.utf8Data));
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
      const oldProxies = rosRoot._proxies;
      const oldSubscribers = rosRoot._subscribers;
      const oldServices = rosRoot._services;
      const oldAdvertisers = rosRoot._advertisers;
      rosRoot._proxies = {};
      rosRoot._subscribers = {};
      rosRoot._services = {};
      rosRoot._advertisers = {};
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
  this._node = rosNode.init(config.name);
  this._target = config.target;
}

Slave.prototype =
{
  enable: function()
  {
    runSlave(this._target);
    this._node.subscribe(TOPIC_SHUTDOWN, (event) =>
    {
      process.exit();
    });
    return this;
  },

  disable: function()
  {
    return this;
  }
};

module.exports = Slave;
