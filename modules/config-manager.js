'use strict';

console.info('Loading Config Manager');

const StateManager = require('./state-manager');


function ConfigManager(target, defaults, validator)
{
  this._target = target;
  this._defaults = defaults;
  this._validator = validator;
  this._state = new StateManager({ name: `config-${this._target._name.replace(/\//g, '_')}` });
  this._service = { service: 'config' };
  let schema = {};
  for (let key in defaults)
  {
    switch (typeof defaults[key])
    {
      case 'number':
        schema[key] = 'Number';
        break;
      case 'string':
        schema[key] = 'String';
        break;
      case 'boolean':
        schema[key] = 'Boolean';
        break;
      default:
        break;
    }
    this._service.schema = Object.assign({}, schema);
    this._service.schema.__return = schema;
  }
}

ConfigManager.prototype =
{
  enable: function()
  {
    this._target._node.service(this._service, (request) => {
      if (this._validator)
      {
        for (let key in request)
        {
          if (!this._validator(key, request[key]))
          {
            delete request[key];
          }
        }
      }
      if (this._state.update(Object.keys(this._defaults), request))
      {
        if (this._target.restart)
        {
          this._target.restart();
        }
        else
        {
          this._target.disable();
          this._target.enable();
        }
      }
      let result = {};
      for (let key in this._defaults)
      {
        result[key] = this._state.get(key) || this._defaults[key];
      }
      return result;
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
    return this._state.get(property) || this._defaults[property];
  },

  update: function(keys, values)
  {
    return this._state.update(keys, values);
  }
}

module.exports = ConfigManager;
