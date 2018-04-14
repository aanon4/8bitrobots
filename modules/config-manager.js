'use strict';

console.info('Loading Config Manager');

const StateManager = require('./state-manager');


function ConfigManager(target, defaults, validator)
{
  this._enabled = 0;
  this._target = target;
  this._defaults = {};
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
        this._defaults[key] = defaults[key];
        break;
      case 'string':
        schema[key] = 'String';
        this._defaults[key] = defaults[key];
        break;
      case 'boolean':
        schema[key] = 'Boolean';
        this._defaults[key] = defaults[key];
        break;
      case 'object': // Enum
        schema[key] = defaults[key].options;
        this._defaults[key] = defaults[key].value;
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
    if (this._enabled++ === 0)
    {
      this._target._node.service(this._service, (request) => {
        for (let key in request)
        {
          if (typeof this._service.schema[key] === 'object' && this._service.schema[key].indexOf(request[key]) === -1)
          {
            delete request[key];
          }
          else if (this._validator && !this._validator(key, request[key]))
          {
            delete request[key];
          }
        }
        if (this._state.update(Object.keys(this._defaults), request))
        {
          this._target.reconfigure();
        }
        let result = {};
        for (let key in this._defaults)
        {
          result[key] = this._state.get(key) || this._defaults[key];
        }
        return result;
      });
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._target._node.unservice(this._service);
    }
    return this;
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
