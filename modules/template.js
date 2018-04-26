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
      this._enable();
    }
    return this;
  },

  _enable: function()
  {
    this._foo = this._config.get('foo');
    // ...
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._disable();
    }
    return this;
  },

  _disable: function()
  {
    // ...
  },

  reconfigure: function(changes)
  {
    if (this._enabled)
    {
      this._disable();
      this._enable();
    }
  }
}

module.exports = template;
