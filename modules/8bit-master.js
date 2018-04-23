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
      case 'unadvertise-force':
      {
        const fn = this._advertisers[msg.topic];
        if (fn)
        {
          delete this._advertisers[msg.topic];
          fn.handler(msg);
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
          const pending = this._pending[msg.topic] || (this._pending[msg.topic] = []);
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
          fn(msg);
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
        if (fn)
        {
          fn(msg);
        }
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
      case 'unservice-force':
      {
        const fn = this._services[msg.service];
        if (fn)
        {
          delete this._services[msg.service];
          fn.handler(msg);
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
        if (fn)
        {
          delete this._proxies[msg.connector];
          fn(msg);
        }
        break;
      }
      case 'call':
      {
        if (!this._proxies[msg.connector])
        {
          console.warn('Attempted call without proxy', JSON.stringify(msg));
          break;
        }
        const fn = this._services[msg.service];
        if (fn)
        {
          fn.handler(msg);
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
  }
};
global['8Bit'] = Root;

const websocket = require('websocket');
const UUID = require('uuid/v4');

const SERVICE_LIST = { service: '/list', schema: {} };

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
            const msg = JSON.parse(message.utf8Data);
            //console.log('<-', message.utf8Data);
            switch (msg.op)
            {
              case 'subscribe-req':
                const shandler = (msg) => {
                  switch (msg.op)
                  {
                    case 'unsubscribe-req':
                      delete subscribers[msg.subscriber];
                      break;
                    default:
                      send(msg);
                      break;
                  }
                };
                subscribers[msg.subscriber] = true;
                Root.event(msg, shandler);
                break;

              case 'connect-req':
                const chandler = (msg) => {
                  switch (msg.op)
                  {
                    case 'disconnect-req':
                      delete proxies[msg.connection];
                      break;
                    default:
                      send(msg);
                      break;
                  }
                }
                proxies[msg.connector] = true;
                Root.event(msg, chandler);
                break;

              case 'advertise':
                const ahandler = (msg) => {
                  switch (msg.op)
                  {
                    case 'unadvertise':
                      delete advertisers[msg.topic];
                      break;
                    case 'unadvertise-force':
                      for (var subscriber in ahandler.subscribers)
                      {
                        Root.event({ timestamp: Date.now(), op: 'unsubscribe-force', subscriber: subscriber });
                      }
                      break;
                    case 'subscribe-req':
                      ahandler.subscribers[msg.subscriber] = true;
                      send(msg);
                      break;
                    case 'unsubscribe-req':
                      delete ahandler.subscribers[msg.subscriber];
                      break;
                    default:
                      send(msg);
                      break;
                  }
                }
                ahandler.subscribers = {};
                advertisers[msg.topic] = true;
                Root.event(msg, ahandler);
                break;

              case 'service':
                const vhandler = (msg) => {
                  switch (msg.op)
                  {
                    case 'unservice':
                      delete services[msg.service];
                      break;
                    default:
                      send(msg);
                      break;
                  }
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
        for (let topic in advertisers)
        {
          Root.event({ timestamp: Date.now(), op: 'unadvertise-force', topic: topic });
        }
        for (let service in services)
        {
          Root.event({ timestamp: Date.now(), op: 'unservice-force', service: service });
        }
        for (let uuid in subscribers)
        {
          Root.event({ timestamp: Date.now(), op: 'unsubscribe-force', subscriber: uuid });
        }
        for (let uuid in proxies)
        {
          Root.event({ timestamp: Date.now(), op: 'disconnect-force', connector: uuid });
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
  this._enabled = 0;
}

Master.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
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
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._node.unservice(SERVICE_LIST);
    }
    return this;
  },
};

module.exports = Master;
