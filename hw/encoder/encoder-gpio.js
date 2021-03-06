'use strict';

console.info('Loading GPIO Encoders.');

const ConfigManager = require('modules/config-manager');

const TOPIC_RATE = { topic: 'rate', schema: { count: 'Number', instantRpm: 'Number', averageRpm: 'Number'} };


function encoder(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._config = new ConfigManager(this,
  {
    friendlyName: '',
    edge:
    {
      value: config.edge || 'falling',
      options: [ 'falling', 'rising', 'both' ]
    },
    countsPerRevolution: config.countsPerRevolution || 0, 
    rpmAverage: config.rpmAverage || 0
  });
  this._gpio = config.gpio;

  this._onEdge = this._onEdge.bind(this);

  this._config.enable();
}

encoder.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._gpio.enable();
      this.reconfigure();
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._gpio.removeListener(this._onEdge);
      this._node.unadvertise(TOPIC_RATE);
      this._adRate = null;
      this._gpio.disable();
    }
    return this;
  },

  reconfigure: function()
  {
    this._edge = this._config.get('edge');
    this._countsPerRevolution = this._config.get('countsPerRevolution');
    this._rpmAverage = this._config.get('rpmAverage') || this._countsPerRevolution;
    this._average = new Array(this._rpmAverage);
    this._avgIdx = 0;
    this._count = 0;
    this._lastEdge = 0;
    this._gpio.removeListener(this._onEdge);
    this._gpio.onEdge(this._edge, this._onEdge);
    if (this._adRate)
    {
      this._node.unadvertise(TOPIC_RATE);
    }
    this._adRate = this._node.advertise(this._friendlyTopic(TOPIC_RATE));
  },

  _onEdge: function()
  {
    this._count++;
    const rate = { count: this._count };
    if (this._countsPerRevolution)
    {
      const now = Date.now();
      rate.instantRpm = 60 / ((now - this._lastEdge) / 1000 * this._countsPerRevolution);
      this._lastEdge = now;
      const oldEdge = this._average[this._avgIdx];
      this._average[this._avgIdx] = now;
      this._avgIdx = (this._avgIdx + 1) % this._average.length;
      rate.averageRpm = this._average.length * 60 / ((now - oldEdge) / 1000 * this._countsPerRevolution);
    }
    this._adRate.publish(rate);
  },

  _friendlyTopic: function(topic)
  {
    const friendlyName = this._config.get('friendlyName');
    return friendlyName ? Object.assign({ friendlyName: `${friendlyName} ${topic.topic}` }, topic) : topic;
  }
}

module.exports = encoder;
