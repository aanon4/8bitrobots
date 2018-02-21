(function()
{
  var pending = [];
  var socket = null;

  var Root =
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
  window['8Bit'] = Root;

  function connect(reconnect)
  {
    if (reconnect)
    {
      window.dispatchEvent(new Event('8BitReconnecting'));
    }
    try
    {
      var opened = false;
      socket = new WebSocket('ws://' + window.location.host + '/8BitApiV1');
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
          Root.event(JSON.parse(event.data));
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