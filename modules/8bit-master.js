'use strict';

console.info('Loading 8-Bit Master.');

const Root =
{
  _advertisers: {},
  _services: {},

  _subscribers: {},
  _proxies: {},
  _pending: {},

  event: function(msg, handler)
  {
    switch (msg.op)
    {
      case 'advertise':
      {
        this._advertisers[msg.topic] = { handler: handler, schema: msg.schema };
        const targets = this._pending[msg.topic];
        if (targets)
        {
          delete this._pending[msg.topic];
          targets.forEach((fn) => {
            fn();
          });
        }
        break;
      }
      case 'unadvertise':
      {
        const fn = this._advertisers[msg.topic];
        if (fn)
        {
          delete this._advertisers[msg.topic];
          fn.handler.remove();
        }
        break;
      }
      case 'subscribe-req':
      {
        const fn = this._advertisers[msg.topic];
        if (fn)
        {
          this._subscribers[msg.subscriber] = handler;
          fn.handler(msg);
        }
        else
        {
          const pending = this._pending[msg.subscriber] || (this._pending[msg.subscriber] = []);
          pending.push(() => {
            this.event(msg, handler);
          });
        }
        break;
      }
      case 'unsubscribe-req':
      {
        const fn = this._subscribers[msg.subscriber];
        if (fn)
        {
          delete this._subscribers[msg.subscriber];
          fn.remove();
        }
        else
        {
          delete this._pending[msg.subscriber];
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
        this._services[msg.service] = { handler: handler, schema: msg.schema };
        const targets = this._pending[msg.service];
        if (targets)
        {
          delete this._pending[msg.service];
          targets.forEach((fn) => {
            fn();
          });
        }
        break;
      }
      case 'unservice':
      {
        const fn = this._services[msg.service];
        if (fn)
        {
          delete this._services[msg.service];
          fn.handler.remove();
        }
        break;
      }
      case 'connect-req':
      {
        const fn = this._services[msg.service];
        if (fn)
        {
          this._proxies[msg.connector] = handler;
          fn.handler(msg);
        }
        else
        {
          const pending = this._pending[msg.service] || (this._pending[msg.service] = []);
          pending.push(() => {
            this.event(msg, handler);
          });
        }
        break;
      }
      case 'disconnect-req':
      {
        const fn = this._proxies[msg.connector];
        delete this._proxies[msg.connector];
        fn.remove();
        break;
      }
      case 'call':
      {
        const fn = this._services[msg.service];
        fn && fn.handler(msg);
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
  }
};
global['8Bit'] = Root;

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
    if (request.resource !== '/8BitApiV1')
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

      const subscribers = {};
      const proxies = {};
      const advertisers = {};
      const services = {};

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
              case 'subscribe-req':
                const shandler = (msg) => {
                  send(msg);
                };
                shandler.remove = () => {
                  delete subscribers[msg.subscriber];
                }
                subscribers[msg.subscriber] = true;
                Root.event(msg, shandler);
                break;

              case 'connect-req':
                const chandler = (msg) => {
                  send(msg);
                }
                chandler.remove = () => {
                  delete proxies[msg.connection];
                }
                proxies[msg.connector] = true;
                Root.event(msg, chandler);
                break;

              case 'advertise':
                const ahandler = (msg) => {
                  send(msg);
                }
                ahandler.remove = () => {
                  delete advertisers[msg.topic];
                }
                advertisers[msg.topic] = true;
                Root.event(msg, ahandler);
                break;

              case 'service':
                const vhandler = (msg) => {
                  send(msg);
                }
                vhandler.remote = () => {
                  delete services[msg.service];
                }
                services[msg.service] = true;
                Root.event(msg, vhandler);
                break;

              default:
                Root.event(msg);
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
          Root.event({ timestamp: Date.now(), op: 'unsubscribe-force', subscriber: uuid });
        }
        for (let uuid in proxies)
        {
          Root.event({ timestamp: Date.now(), op: 'disconnect-force', connector: uuid });
        }
        for (let topic in advertisers)
        {
          Root.event({ timestamp: Date.now(), op: 'unadvertise', topic: topic });
        }
        for (let service in services)
        {
          Root.event({ timestamp: Date.now(), op: 'unservice', service: service });
        }
        delete connections[id];
      });
    }
  });
};

function Master(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
}

Master.prototype =
{
  enable: function()
  {
    runMaster(global.webserver);
    this._node.service(SERVICE_LIST, (request) =>
    {
      return {
        topics: Object.keys(Root._advertisers).map((name) => {
          return { name: name, schema: Root._advertisers[name].schema };
        }),
        services: Object.keys(Root._services).map((name) => {
          return { name: name, schema: Root._services[name].schema };
        })
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
