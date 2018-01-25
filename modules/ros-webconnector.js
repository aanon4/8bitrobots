(function()
{
  var pending = [];
  var socket = null;

  window.rosRoot =
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
    },

    sendToMaster: function(msg)
    {
      msg = JSON.stringify(msg);
      const doSend = () =>
      {
        if (socket && socket.readyState === 1)
        {
          //console.log('->', msg);
          socket.send(msg);
        }
        else
        {
          pending.push(doSend);
        }
      }
      doSend();
    }
  };

  function connect(reconnect)
  {
    if (reconnect)
    {
      window.dispatchEvent(new Event('ROSReconnecting'));
    }
    try
    {
      var opened = false;
      socket = new WebSocket('ws://' + window.location.host + '/ros');
      socket.onopen = function()
      {
        opened = true;
        const pend = pending;
        pending = [];
        pend.forEach((fn) => {
          fn();
        });
      }
      socket.onmessage = function(event)
      {
        try
        {
          //console.log('<-', event.data);
          var msg = JSON.parse(event.data);
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
      socket.onerror = function(event)
      {
      }
      socket.onclose = function(event)
      {
        socket = null;
        if (opened)
        {
          let oldProxies = rosRoot._proxies;
          let oldSubscribers = rosRoot._subscribers;
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
          connect(true);
        }
        else
        {
          setTimeout(function()
          {
            connect(false);
          }, 1000);
        }
      }
    }
    catch (_)
    {
      socket = null;
      setTimeout(function()
      {
        connect(false);
      }, 1000);
    }
  }
  
  connect(false);

})();
