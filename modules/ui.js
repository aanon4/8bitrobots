'use strict';

console.info('Loading UI.');

function UI(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._server = config.server;
  this._enabled = 0;
  this._pages = config.pages;
}

UI.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      const addpage = this._node.proxy({ service: `${this._server}/add_page` });
      for (let from in this._pages)
      {
        addpage({ from: from, to: this._pages[from] });
      }
      this._node.unproxy({ service: `${this._server}/add_page` });
    }
    return this;
  },
  
  disable: function()
  {
    --this._enabled;
    return this;
  }
}

module.exports = UI;
