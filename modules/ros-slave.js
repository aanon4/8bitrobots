'use strict';

console.info('Loading Slave ROS.');

const websocket = require('websocket');
const UUID = require('uuid/v4');

const TOPIC_SHUTDOWN = { topic: '/health/shutdown' };

global.rosRoot =
{
  _subscribers: {},
  _proxies: {},

  advertise: function(target, handler)
  {
    throw new Error('Not supported yet');
  },

  unadvertise: function(target)
  {
    throw new Error('Not supported yet');
  },

  subscribe: function(uuid, handler, target, msg)
  {
    this._subscribers[uuid] = handler;
    this.sendToMaster(msg);
  },

  unsubscribe: function(uuid)
  {
    let fn = this._subscribers[uuid];
    delete this._subscribers[uuid];
    fn.remove();
  },

  publish: function(target, msg)
  {
    let fn = this._subscribers[target];
    fn && fn(msg);
  },

  service: function(target, handler)
  {
    throw new Error('Not supported yet');
  },

  unservice: function(target)
  {
    throw new Error('Not supported yet');
  },

  connect: function(uuid, handler, target, msg)
  {
    this._proxies[uuid] = handler;
    this.sendToMaster(msg);
  },

  disconnect: function(target, msg)
  {
    const fn = this._proxies[target];
    delete this._proxies[target];
    fn.remove();
  },

  call: function(target, msg)
  {
    this.sendToMaster(msg);
  },

  reply: function(target, msg)
  {
    let fn = this._proxies[target];
    fn && fn(msg);
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
          const msg = JSON.parse(message.utf8Data);
          switch (msg.op)
          {
            case 'connected':
              rosRoot.reply(msg.connector, msg);
              break;

            case 'subscribed':
              break;

            case 'topic':
              rosRoot.publish(msg.subscriber, msg);
              break;

            case 'reply':
              rosRoot.reply(msg.caller, msg);
              break;

            default:
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
      const oldProxies = rosRoot._proxies;
      const oldSubscribers = rosRoot._subscribers;
      rosRoot._proxies = {};
      rosRoot._subscribers = {};
      for (let proxy in oldProxies)
      {
        oldProxies[proxy]({ timestamp: Date.now(), op: 'disconnected', connector: proxy });
      }
      for (let subscriber in oldSubscribers)
      {
        oldSubscribers[subscriber]({ timestamp: Date.now(), op: 'unsubscribed', subscriber: subscriber });
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
