rosEmitter = {};

(function()
{
  var pending = [];
  var socket = null;
  var listeners = {};

  function socketQ(fn)
  {
    if (pending === null)
    {
      fn();
    }
    else
    {
      pending.push(fn);
    }
  }

  function connect(reconnect)
  {
    if (reconnect)
    {
      window.dispatchEvent(new Event('ROSReconnecting'));
    }
    try
    {
      var opened = false;
      socket = new WebSocket('ws://' + window.location.host + '/socket');
      socket.onopen = function()
      {
        opened = true;
        var todo = pending;
        pending = null;
        todo.forEach(function(fn)
        {
          fn();
        });
      }
      socket.onmessage = function(event)
      {
        try
        {
          var msg = JSON.parse(event.data);
          switch (msg.op)
          {
            case 'emit':
              (listeners[msg.name] || []).forEach(function(l)
              {
                try
                {
                  l.call(null, msg.event);
                }
                catch (e)
                {
                  console.error(e);
                }
              });
              break;

            case 'addListener':
            case 'removeListener':
              // Ignored - UI doesn't create anything to listen to
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
        console.log('ERROR');
      }
      socket.onclose = function(event)
      {
        if (opened)
        {
          pending = [];
          for (var name in listeners)
          {
            (function(name)
            {
              pending.push(function()
              {
                socket.send(JSON.stringify({ op: 'addListener', name: name }));
              });
            })(name);
          }
          socket = null;
          connect(true);
        }
        else
        {
          socket = null;
          pending = [];
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
      pending = [];
      setTimeout(function()
      {
        connect(false);
      }, 1000);
    }
  }

  rosEmitter.addListener = function(name, listener)
  {
    if (listeners[name] === undefined)
    {
      socketQ(function()
      {
        socket.send(JSON.stringify({ op: 'addListener', name: name }));
      });
    }
    (listeners[name] || (listeners[name] = [])).push(listener);
  };

  rosEmitter.removeListener = function(name, listener)
  {
    var idx = (listeners[name] || []).indexOf(listener);
    if (idx != -1)
    {
      listeners[name].splice(idx, 1);
      if (listeners[name].length === 0)
      {
        delete listeners[name];
        socketQ(function()
        {
          socket.send(JSON.stringify({ op: 'removeListener', name: name }));
        });
      }
    }
  };

  rosEmitter.emit = function(name, event)
  {
    socketQ(function()
    {
      socket.send(JSON.stringify({ op: 'emit', name: name, event: event }));
    });
  };
  
  connect(false);

})();
