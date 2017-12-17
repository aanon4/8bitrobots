'use strict';

console.info('Loading State Manager.');

const fs = require('fs');


function StateManager(config)
{
  this._name = config.name;
  this._path = config.path || `./saved/${this._name}-state.json`;
  this._data = null;
}

StateManager.prototype =
{
  set: function(property, value)
  {
    this._loadData()[property] = value;
    this._saveData();
  },

  get: function(property, def)
  {
    const data = this._loadData();
    if (!(property in data))
    {
      data[property] = def;
      this._saveData();
    }
    return data[property];
  },

  _loadData: function()
  {
    if (!this._data)
    {
      try
      {
        this._data = JSON.parse(fs.readFileSync(this._path));
      }
      catch (_)
      {
        this._data = {};
      }
    }
    return this._data;
  },

  _saveData: function()
  {
    fs.writeFileSync(this._path, JSON.stringify(this._data));
  }
};

module.exports = StateManager;
