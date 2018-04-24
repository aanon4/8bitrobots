'use strict';

console.info('Loading Server.');

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const SERVICE_ADD_PAGE = { service: 'add_page', schema: { pages: 'Hash' } };


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
      const info = this._pages[key];
      if (url.indexOf(key) === 0 && info.type === 'file' && fs.lstatSync(info.to).isDirectory())
      {
        page = { type: 'file', to: info.to + url.substring(key.length) };
        break;
      }
    }
  }
  switch (page ? page.type : 'unknown')
  {
    case 'file':
      const text = fs.readFileSync(page.to);
      const headers =
      {
        'Content-Length': text.length,
        'Access-Control-Allow-Origin': '*'
      };
      switch (path.extname(page.to))
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
      break;

    case 'redirect':
      response.writeHead(302, { Location: page.to });
      response.end();
      break;

    case 'unknown':
    default:
      response.writeHead(404);
      response.end();
      break;
  }
}

function Server(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._port = config.port || 80;
  this._pages = {};
}

Server.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      let webserver = http.createServer(incoming.bind(this));
      webserver.listen(this._port);
      global.webserver = webserver;

      this._node.service(SERVICE_ADD_PAGE, (request) =>
      {
        const from = request.from;
        const to = request.to;
        if (from in this._pages && this._pages[from] != to)
        {
          throw new Error(`Page mismatch: ${from}`);
        }
        try
        {
          fs.accessSync(to);
          this._pages[from] = { type: 'file', to: to };
        }
        catch (_)
        {
          if (url.parse(to).protocol === 'http:')
          {
            this._pages[from] = { type: 'redirect', to: to };
          }
          else
          {
            console.warn(`Unknown page ${from} to ${to}.`);
          }
        }
        return true;
      });
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._node.unservice(SERVICE_ADD_PAGE);
      global.webserver = null;
    }
    return this;
  }
}

module.exports = Server;
