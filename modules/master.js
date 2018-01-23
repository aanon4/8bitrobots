'use strict';

console.info('Loading Master.');

const websocket = require('websocket');
const UUID = require('uuid/v4');

const SERVICE_LIST = { service: '/list' };

function runMaster(webserver)
{
  let websocketserver = new websocket.server(
  {
    httpServer: webserver
  });

  let connections = {};
  let localListeners = {};
  function sendAll(event)
  {
    event = JSON.stringify(event);
    for (var id in connections)
    {
      connections[id].sendUTF(event);
    }
  }

  websocketserver.on('request', function(request)
  {
    if (request.resource !== '/ros')
    {
      request.reject();
    }
    else
    {
      let id = UUID();
      var listeners = {};
      let connection = request.accept(null, request.origin);
      connections[id] = connection;

      function send(event)
      {
        connection.sendUTF(JSON.stringify(event));
      }

      connection.on('message', function(message)
      {
        if (message.type === 'utf8')
        {
          try
          {
            let msg = JSON.parse(message.utf8Data);
            switch (msg.op)
            {
              case 'addListener':
                listeners[msg.name] = function(event)
                {
                  if (event.__remote !== id)
                  {
                    send({ op: 'emit', name: msg.name, event: event });
                  }
                };
                listeners[msg.name].__remote = id;
                __rosEmitter.addListener(msg.name, listeners[msg.name]);
                break;
              case 'removeListener':
                __rosEmitter.removeListener(msg.name, listeners[msg.name]);
                delete listeners[msg.name];
                break;
              case 'emit':
                msg.event.__remote = id;
                __rosEmitter.emit(msg.name, msg.event);
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
        for (var name in listeners)
        {
          __rosEmitter.removeListener(name, listeners[name]);
        }
        listeners = {};
        delete connections[id];
      });

      for (var eventName in localListeners)
      {
        send({ op: 'addListener', name: eventName });
      }
    }
  });

  __rosEmitter.on('removeListener', (eventName, listener) =>
  {
    /*if (!listener.__remote)
    {
      if (localListeners[eventName] == 1)
      {
        delete localListeners[eventName];
        sendAll({ op: 'removeListener', name: eventName });
      }
      else
      {
        localListeners[eventName]--;
      }
    }*/
  });
  __rosEmitter.on('newListener', (eventName, listener) =>
  {
    /*if (!listener.__remote)
    {
      if (eventName in localListeners)
      {
        localListeners[eventName]++;
      }
      else
      {
        localListeners[eventName] = 1;
        sendAll({ op: 'addListener', name: eventName });
      }
    }*/
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
      const topics = [];
      const services = [];
      let eventNames = [];
      if (__rosEmitter.eventNames)
      {
        eventNames = __rosEmitter.eventNames();
      }
      else
      {
        for (let name in __rosEmitter._events)
        {
          eventNames.push(name);
        } 
      }
      eventNames.forEach((name) => {
        if (name.match(/\/__subscribe$/))
        {
          topics.push(name.substring(0, name.length - 12));
        }
        else if (name.match(/\/__connect$/))
        {
          services.push(name.substring(0, name.length - 10));
        }
      });
      return {
        topics: topics,
        services: services
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
