'use strict';

console.info('Loading ... .');


function template(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
}

template.prototype =
{
  enable: function()
  {
    return this;
  },
  
  disable: function()
  {
    return this;
  }
}

module.exports = template;
