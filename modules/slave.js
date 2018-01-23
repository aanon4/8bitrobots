'use strict';

console.info('Loading Slave.');

const websocket = require('websocket');
const UUID = require('uuid/v4');

const TOPIC_SHUTDOWN = { topic: '/health/shutdown' };


function runSlave(target)
{
  const id = UUID();

  let connection = null;
  let pending = [];

  function send(event)
  {
    event = JSON.stringify(event);
    function doSend()
    {
      if (connection)
      {
        connection.sendUTF(event);
      }
      else
      {
        pending.push(doSend);
      }
    }
    doSend();
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

  let remoteListeners = {};
  let localListeners = {};

  websocketclient.on('connect', (conn) =>
  {
    connection = conn;

    connection.on('message', (message) =>
    {
      if (message.type === 'utf8')
      {
        try
        {
          const msg = JSON.parse(message.utf8Data);
          switch (msg.op)
          {
            case 'addListener':
              remoteListeners[msg.name] = (event) =>
              {
                if (event.__remote !== id)
                {
                  send({ op: 'emit', name: msg.name, event: event });
                }
              };
              remoteListeners[msg.name].__remote = id;
              __rosEmitter.addListener(msg.name, remoteListeners[msg.name]);
              break;
            case 'removeListener':
              __rosEmitter.removeListener(msg.name, remoteListeners[msg.name]);
              delete remoteListeners[msg.name];
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
    connection.on('close', () =>
    {
      for (let name in remoteListeners)
      {
        __rosEmitter.removeListener(name, remoteListeners[name]);
      }
      remoteListeners = {};
      reconnect();
    });

    const pend = pending;
    pending = [];
    pend.forEach((fn) =>
    {
      fn();
    });

  });
  websocketclient.on('connectFailed', () =>
  {
    // Retry
    reconnect();
  });
  websocketclient.connect(target);

  let _sendToMaster = [];

  __rosEmitter.on('removeListener', (eventName, listener) =>
  {
    if (listener.__remote !== id)
    {
      if (localListeners[eventName] == 1)
      {
        delete localListeners[eventName];
        send({ op: 'removeListener', name: eventName });
      }
      else
      {
        localListeners[eventName]--;
      }
    }
  });
  __rosEmitter.on('newListener', (eventName, listener) =>
  {
    if (_sendToMaster.indexOf(listener) !== -1)
    {
      return;
    }
    if (eventName in localListeners)
    {
      localListeners[eventName]++;
    }
    else
    {
      localListeners[eventName] = 1;
      send({ op: 'addListener', name: eventName });
      if (eventName.substr(-10) === '/__connect')
      {
        function connectToMaster(event)
        {
          if (event.available === null)
          {
            send({ op: 'emit', name: eventName, event: event });
          }
          else if (event.available === true)
          {
            const newEventName = eventName.substring(0, eventName.length - 10);
            function sendToMaster(event)
            {
              send({ op: 'emit', name: newEventName, event: event });
            }
            _sendToMaster.push(sendToMaster);
            __rosEmitter.addListener(newEventName, sendToMaster);
          }
        }
        _sendToMaster.push(connectToMaster);
        __rosEmitter.addListener(eventName, connectToMaster);
      }
    }
  });
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
    this._node.subscribe(TOPIC_SHUTDOWN, (event) =>
    {
      process.exit();
    });
    runSlave(this._target);
    return this;
  },

  disable: function()
  {
    return this;
  }
};

module.exports = Slave;
