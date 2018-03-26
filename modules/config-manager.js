'use strict';

console.info('Loading Config Manager');

const StateManager = require('./state-manager');


function ConfigManager(target, defaults)
{
  this._target = target;
  this._defaults = defaults;
  this._state = new StateManager({ name: `config-${this._target._name.replace(/\//g, '_')}` });
  this._service = { service: 'config', schema: {} };
  for (let key in defaults)
  {
    if (typeof defaults[key] === 'number')
    {
      this._service.schema[key] = 'Number';
    }
    else if (typeof defaults[key] === 'string')
    {
      this._service.schema[key] = 'String';
    }
  }
}

ConfigManager.prototype =
{
  enable: function()
  {
    this._target._node.service(this._service, (request) => {
      if (this._state.update(Object.keys(this._defaults), request))
      {
        this._target.disable();
        this._target.enable();
      }
    });
  },

  disable: function()
  {
    this._target._node.unservice(this._service);
  },

  set: function(property, value)
  {
    return this._state.set(property, value);
  },

  get: function(property)
  {
    return this._state.get(property, this._defaults[property]);
  },

  update: function(keys, values)
  {
    return this._state.update(keys, values);
  }
}

module.exports = ConfigManager;
