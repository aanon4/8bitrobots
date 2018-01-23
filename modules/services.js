const path = require('path');

function Services()
{
  this._services = [];
}

Services.prototype =
{ 
  loadConfig: function(configName)
  {
    const orequire = module.__proto__.require;
    module.__proto__.require = function(name)
    {
      try
      {
        return orequire.call(this, name);
      }
      catch (e)
      {
        if (e.code === 'MODULE_NOT_FOUND')
        {
          return orequire(`../${name}.js`);
        }
        else
        {
          console.error(`Error loading: ${name}`);
          throw e;
        }
      }
    }

    const fs = require('fs');
    var files = fs.readdirSync(`./config/${configName}`);
    files.sort();
    files.forEach((file) =>
    {
      if (/^[A-Z]_.*\.js$/.test(file))
      {
        this.load(require(`../config/${configName}/${file}`));
      }
    });
    for (var i = 0; i < this._services.length; i++)
    {
      try
      {
        console.info(`Starting ${this._services[i]._name}.`);
        this._services[i].enable();
      }
      catch (e)
      {
        console.error(e.stack);
      }
    }
  },

  load: function(loader)
  {
    try
    {
      const service = loader();
      if (service)
      {
        this._services.push(service);
      }
    }
    catch (e)
    {
      console.error(e.stack);
    }
  },
  
  shutdown: function()
  {
    console.log();
    for (var i = this._services.length - 1; i >= 0; i--)
    {
      try
      {
        console.info(`Stopping ${this._services[i]._name}.`);
        this._services[i].disable();
      }
      catch (e)
      {
        console.log(e.stack);
      }
    }
  },
  
  byName: function(name)
  {
    for (var i = 0; i < this._services.length; i++)
    {
      if (this._services[i]._name === name)
      {
        return this._services[i];
      }
    }
    return null;
  }
}

// Shutdown services cleanly
process.on('exit', function()
{
  module.exports.shutdown();
});

module.exports = new Services();
