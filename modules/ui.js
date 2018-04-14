'use strict';

console.info('Loading UI.');

function UI(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._addpages = `${config.target}/add_pages`;
  this._pages = config.pages;
}

UI.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._node.proxy({ service: this._addpages })({ pages: this._pages }).then(() => {
        this._node.unproxy({ service: this._addpages });
      });
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
