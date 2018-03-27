'use strict';

console.info('Loading Environment.');

const WATER_DENSITY =
{
  fresh: 997,
  salt: 1029
};

const TOPICS_ENVIRONMENT = [ 'temperature', 'pressure', 'humidity' ];

const TOPIC_SETWATER = { topic: 'set_water' };
const TOPIC_WATER = { topic: 'water_density' };
const TOPIC_TEMPERATURE_INTERNAL = { topic: 'internal/temperature', schema: { C: 'Number' } };
const TOPIC_PRESSURE_INTERNAL = { topic: 'internal/pressure', schema: { Pa: 'Number' } };
const TOPIC_HUMIDITY_INTERNAL = { topic: 'internal/humidity', schema: { '%': 'Number' } };
const TOPIC_TEMPERATURE_EXTERNAL = { topic: 'external/temperature', schema: { C: 'Number' } };
const TOPIC_PRESSURE_EXTERNAL = { topic: 'external/pressure', schema: { Pa: 'Number' } };
const TOPIC_HUMIDITY_EXTERNAL = { topic: 'external/humidity', schema: { '%': 'Number' } };


function environment(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);

  this._internals = config.internal || [];
  this._externals = config.external || [];
  
  this._internal =
  {
    temperature: {},
    pressure: {},
    humidity: {}
  };
  this._external =
  {
    temperature: {},
    pressure: {},
    humidity: {}
  };
}

environment.prototype =
{
  enable: function()
  {
    this._internals.forEach((internal) =>
    {
      TOPICS_ENVIRONMENT.forEach((topic) =>
      {
        this._node.subscribe({ topic: `${internal}/${topic}` }, (event) =>
        {
          this._process(this._internal, internal, topic, event);
        });
      });
    });
    this._externals.forEach((external) =>
    {
      TOPICS_ENVIRONMENT.forEach((topic) =>
      {
        this._node.subscribe({ topic: `${external}/${topic}` }, (event) =>
        {
          this._process(this._external, external, topic, event);
        });
      });
    });

    this._node.subscribe(TOPIC_SETWATER, (event) =>
    {
      if (event.water in WATER)
      {
        if (!this._adWater)
        {
          this._adWater = this._node.advertise(TOPIC_WATER);
        }
        this._adWater.publish(
        {
          water: event.water,
          density: WATER_DENSITY[event.water]
        });
      }
    });

    if (this._internals.length)
    {
      this._internal.temperature._ad = this._node.advertise(TOPIC_TEMPERATURE_INTERNAL);
      this._internal.pressure._ad = this._node.advertise(TOPIC_PRESSURE_INTERNAL);
      this._internal.humidity._ad = this._node.advertise(TOPIC_HUMIDITY_INTERNAL);
    }
    if (this._externals.length)
    {
      this._external.temperature._ad = this._node.advertise(TOPIC_TEMPERATURE_EXTERNAL);
      this._external.pressure._ad = this._node.advertise(TOPIC_PRESSURE_EXTERNAL);
      this._external.humidity._ad = this._node.advertise(TOPIC_HUMIDITY_EXTERNAL);
    }

    return this;
  },

  disable: function()
  {
    if (this._internals.length)
    {
      this._node.unadvertise(TOPIC_TEMPERATURE_INTERNAL);
      this._node.unadvertise(TOPIC_PRESSURE_INTERNAL);
      this._node.unadvertise(TOPIC_HUMIDITY_INTERNAL);
    }
    if (this._externals.length)
    {
      this._node.unadvertise(TOPIC_TEMPERATURE_EXTERNAL);
      this._node.unadvertise(TOPIC_PRESSURE_EXTERNAL);
      this._node.unadvertise(TOPIC_HUMIDITY_EXTERNAL);
    }
    if (this._adWater)
    {
      this._node.unadvertise(TOPIC_WATER);
    }
    this._node.unsubscribe(TOPIC_SETWATER);

    this._internals.forEach((internal) =>
    {
      TOPICS_ENVIRONMENT.forEach((topic) =>
      {
        this._node.unsubscribe({ topic: `${internal}/${topic}` });
      });
    });
    this._externals.forEach((external) =>
    {
      TOPICS_ENVIRONMENT.forEach((topic) =>
      {
        this._node.unsubscribe({ topic: `${external}/${topic}` });
      });
    });
  
    return this;
  },
  
  _process: function(group, name, topic, event)
  {
    const keys =
    {
      temperature: 'C',
      pressure: 'Pa',
      humidity: '%'
    };
    group[topic][name] = event[keys[topic]];

    var val = 0;
    var count = 0;
    for (var key in group[topic])
    {
      if (key[0] !== '_')
      {
        val += group[topic][key];
        count++;
      }
    }
    if (count)
    {
      group[topic]._ad.publish({ [keys[topic]]: parseFloat((val / count).toFixed(2)) })
    }
  }
}

module.exports = environment;
