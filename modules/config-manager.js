'use strict';

console.info('Loading Config Manager');

const StateManager = require('./state-manager');

function ConfigManager(name, defaults)
{
  this._defaults = defaults;
  this._state = new StateManager({ name: `config-${name.replace(/\//g, '_')}` });
}

ConfigManager.prototype =
{
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
