'use strict';

console.info('Loading UI.');

function UI(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._addpages = `${config.target}/add_pages`;
  this._pages = config.pages;
}

UI.prototype =
{
  enable: function()
  {
    this._node.proxy({ service: this._addpages })({ pages: this._pages }).then(() => {
      this._node.unproxy({ service: this._addpages });
    });
  
    return this;
  },
  
  disable: function()
  {
    return this;
  }
}

module.exports = UI;
