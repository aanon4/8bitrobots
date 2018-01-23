'use strict';

console.info('Loading UI.');

const http = require('http');
const fs = require('fs');
const path = require('path');
const Service = require('../modules/services');


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
    let headers =
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

      default:
        break;
    }
    response.writeHead(200, headers);
    response.write(text);
    response.end();
  }
  else if (url.indexOf('/video/') === 0 && this._camera)
  {
    if (!this._camera.httpVideo(response, url[7]))
    {
      response.writeHead(404);
      response.end();
    }
  }
  else
  {
    response.writeHead(404);
    response.end();
  }
}

function UI(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  this._port = config.port || 8080;
  this._pages = config.pages;
  this._camera = Service.byName(config.camera);
}

UI.prototype =
{
  enable: function()
  {
    let webserver = http.createServer(incoming.bind(this));
    webserver.listen(this._port);
    global.webserver = webserver;
    return this;
  },
  
  disable: function()
  {
    global.webserver = null;
    return this;
  }
}

module.exports = UI;
