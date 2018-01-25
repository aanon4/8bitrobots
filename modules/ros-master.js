'use strict';

console.info('Loading Master ROS.');

global.rosRoot =
{
  _advertisers: {},
  _services: {},

  _subscribers: {},
  _proxies: {},
  _pending: {},

  advertise: function(target, handler)
  {
    this._advertisers[target] = handler;
    const targets = this._pending[target];
    if (targets)
    {
      delete this._pending[target];
      targets.forEach((fn) => {
        fn();
      });
    }
  },

  unadvertise: function(target)
  {
    const fn = this._advertisers[target];
    delete this._advertisers[target];
    fn.remove();
  },

  subscribe: function(uuid, handler, target, msg)
  {
    this._subscribers[uuid] = handler;
    let fn = this._advertisers[target];
    if (fn)
    {
      fn(msg);
    }
    else
    {
      const pending = this._pending[target] || (this._pending[target] = []);
      pending.push(() => {
        this.subscribe(uuid, handler, target, msg);
      });
    }
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
    this._services[target] = handler;
    const targets = this._pending[target];
    if (targets)
    {
      delete this._pending[target];
      targets.forEach((fn) => {
        fn();
      });
    }
  },

  unservice: function(target)
  {
    const fn = this._services[target];
    delete this._services[target];
    fn.remove();
  },

  connect: function(uuid, handler, target, msg)
  {
    this._proxies[uuid] = handler;
    let fn = this._services[target];
    if (fn)
    {
      fn(msg);
    }
    else
    {
      const pending = this._pending[target] || (this._pending[target] = []);
      pending.push(() => {
        this.connect(uuid, handler, target, msg);
      });
    }
  },

  disconnect: function(target, msg)
  {
    const fn = this._proxies[target];
    delete this._proxies[target];
    fn.remove();
  },

  call: function(target, msg)
  {
    let fn = this._services[target];
    fn && fn(msg);
  },

  reply: function(target, msg)
  {
    let fn = this._proxies[target];
    fn && fn(msg);
  }
};

const websocket = require('websocket');
const UUID = require('uuid/v4');

const SERVICE_LIST = { service: '/list' };

function runMaster(webserver)
{
  const websocketserver = new websocket.server(
  {
    httpServer: webserver
  });

  const connections = {};

  websocketserver.on('request', function(request)
  {
    if (request.resource !== '/ros')
    {
      request.reject();
    }
    else
    {
      const id = UUID();
      const connection = request.accept(null, request.origin);
      connections[id] = connection;

      function send(msg)
      {
        //console.log('->', JSON.stringify(msg));
        connection.sendUTF(JSON.stringify(msg));
      }

      const subscribers = [];
      const proxies = [];

      connection.on('message', function(message)
      {
        if (message.type === 'utf8')
        {
          try
          {
            let msg = JSON.parse(message.utf8Data);
            //console.log('<-', message.utf8Data);
            switch (msg.op)
            {
              case 'subscribe':
                const shandler = (msg) => {
                  send(msg);
                };
                shandler.remove = () => {
                }
                subscribers[msg.subscriber] = true;
                rosRoot.subscribe(msg.subscriber, shandler, msg.topic, msg);
                break;

              case 'unsubscribe':
                rosRoot.unsubscribe(msg.subscriber);
                break;

              case 'connect':
                const chandler = (msg) => {
                  send(msg);
                }
                chandler.remove = () => {
                }
                proxies[msg.connector] = true;
                rosRoot.connect(msg.connector, chandler, msg.service, msg);
                break;

              case 'disconnect':
                rosRoot.disconnect(msg.connector);
                break;

              case 'call':
                rosRoot.call(msg.service, msg);
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
      connection.on('close', function()
      {
        for (let uuid in subscribers)
        {
          rosRoot.unsubscribe(uuid);
        }
        for (let uuid in proxies)
        {
          rosRoot.disconnect(uuid);
        }
        delete connections[id];
      });
    }
  });
};

function Master(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
}

Master.prototype =
{
  enable: function()
  {
    runMaster(global.webserver);
    this._node.service(SERVICE_LIST, (request) =>
    {
      return {
        topics: Object.keys(rosRoot._advertisers),
        services: Object.keys(rosRoot._services)
      };
    });
    return this;
  },

  disable: function()
  {
    this._node.unservice(SERVICE_LIST);
    return this;
  },
};

module.exports = Master;
