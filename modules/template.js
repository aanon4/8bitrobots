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
}

template.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._config.enable();
      this._foo = this._config.get('foo');
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._config.disable();
    }
    return this;
  }
}

module.exports = template;
