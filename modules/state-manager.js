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
    const data = this._loadData();
    if (data[property] !== value)
    {
      data[property] = value;
      this._saveData();
      return true;
    }
    else
    {
      return false;
    }
  },

  get: function(property, def)
  {
    const data = this._loadData();
    if (!(property in data) && def !== undefined)
    {
      data[property] = def;
      this._saveData();
    }
    return data[property];
  },

  update: function(properties, values)
  {
    const data = this._loadData();
    let change = false;
    properties.forEach((property) => {
      if (property in values && values[property] !== data[property])
      {
        data[property] = values[property];
        change = true;
      }
    });
    if (change)
    {
      this._saveData();
    }
    return change;
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
