'use strict';

console.info('Loading Server.');

const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVICE_ADD_PAGES = { service: 'add_pages' };


function incoming(request, response)
{
  const url = request.url;
  if (url.indexOf('..') != -1)
  {
    response.writeHead(404);
    response.end();
    return;
  }
  let page = this._pages[url];
  if (!page)
  {
    for (let key in this._pages)
    {
      if (url.indexOf(key) === 0 && fs.lstatSync(this._pages[key]).isDirectory())
      {
        page = this._pages[key] + url.substring(key.length);
        break;
      }
    }
  }
  if (page)
  {
    const text = fs.readFileSync(page);
    const headers =
    {
      'Content-Length': text.length,
      'Access-Control-Allow-Origin': '*'
    };
    switch (path.extname(page))
    {
      case '.html':
        headers['Content-Type'] = 'text/html';
        break;
      case '.js':
        headers['Content-Type'] = 'application/x-javascript';
        break;
      case '.png':
        headers['Content-Type'] = 'image/png';
        break;

      default:
        break;
    }
    response.writeHead(200, headers);
    response.write(text);
    response.end();
  }
  else
  {
    response.writeHead(404);
    response.end();
  }
}

function Server(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._port = config.port || 8080;
  this._pages = {};
}

Server.prototype =
{
  enable: function()
  {
    let webserver = http.createServer(incoming.bind(this));
    webserver.listen(this._port);
    global.webserver = webserver;

    this._node.service(SERVICE_ADD_PAGES, (request) =>
    {
      for (let page in request.pages)
      {
        if (page in this._pages && this._pages[page] != request.pages[page])
        {
          throw new Error(`Page mismatch: ${page}`);
        }
        else
        {
          this._pages[page] = request.pages[page];
        }
      }
      return true;
    });

    return this;
  },
  
  disable: function()
  {
    this._node.unservice(SERVICE_ADD_PAGES);
    global.webserver = null;

    return this;
  }
}

module.exports = Server;
