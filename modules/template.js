'use strict';

console.info('Loading ... .');

const ConfigManager = require('modules/config-manager');


function template(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._config = new ConfigManager(this,
  {
    foo: config.foo || false
  });
  // ...
  this._config.enable();
}

template.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._foo = this._config.get('foo');
      // ...
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      // ...
    }
    return this;
  },

  reconfigure: function()
  {
    // ...
  }
}

module.exports = template;
