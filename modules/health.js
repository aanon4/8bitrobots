'use strict';

console.info('Loading Health Monitor.');

const usage = require('usage');
const filters = require('../modules/filters');

const batteryCurves =
{
  LiFeO4:
  [
    { hV: 99.00, lV:  4.40, hP: 100, lP: 100 },
    { hV:  4.40, lV:  4.10, hP: 100, lP:  95 },
    { hV:  4.13, lV:  4.03, hP:  95, lP:  20 },
    { hV:  4.03, lV:  3.20, hP:  20, lP:   0 } 
  ],
  LiPo:
  [
    { hV: 99.00, lV:  4.20, hP: 100, lP: 100 },
    { hV:  4.20, lV:  4.03, hP: 100, lP:  76 },
    { hV:  4.03, lV:  3.86, hP:  76, lP:  52 },
    { hV:  3.86, lV:  3.83, hP:  52, lP:  42 },
    { hV:  3.83, lV:  3.79, hP:  42, lP:  30 },
    { hV:  3.79, lV:  3.70, hP:  30, lP:  11 },
    { hV:  3.70, lV:  3.60, hP:  11, lP:   5 },
    { hV:  3.60, lV:  3.30, hP:   5, lP:   0 },
    { hV:  3.30, lv:  0.00, hP:   0, lP:   0 }
  ]
};

const TOPIC_HEALTH = { topic: 'status', schema: { good: 'Boolean', status: 'String', details: 'Array' } };
const TOPIC_COMPUTE = { topic: 'compute', schema: { 'cpu%': 'Number', 'mem%': 'Number' } };
const TOPIC_BATTERY = { topic: 'battery', schema: { '%': 'Number' } };
const TOPIC_SHUTDOWN = { topic: 'shutdown', schema: { 'shutdown': 'String' } };

function health(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._metrics = config.metrics || [];
  this._values = [];
  for (var i = 0; i < this._metrics.length; i++)
  {
    var metric = this._metrics[i];
    this._values[i] = filters.Median(5);
    if (metric.chemistry)
    {
      this._battery = metric;
      this._curve = batteryCurves[this._battery.chemistry];
      this._cells = this._battery.cells;
      this._batteryLevel = filters.Median(5);
    }
  }
}

health.prototype =
{
  enable: function()
  {
    this._metrics.forEach((metric, idx) =>
    {
      this._node.subscribe({ topic: metric.topic }, (event) => 
      {
        this._processMetric(idx, event);
      });
    });
    this._adHealth = this._node.advertise(TOPIC_HEALTH);
    this._adCompute = this._node.advertise(TOPIC_COMPUTE);
    this._adBattery = this._node.advertise(TOPIC_BATTERY);
    this._adShutdown = this._node.advertise(TOPIC_SHUTDOWN);
    this._clock = setInterval(() => {
      this._cpuMonitor();
    }, 1000);
    return this;
  },

  disable: function()
  {
    clearInterval(this._clock);
    this._node.unadvertise(TOPIC_COMPUTE);
    this._node.unadvertise(TOPIC_BATTERY);
    this._node.unadvertise(TOPIC_SHUTDOWN);
    this._node.unadvertise(TOPIC_HEALTH);
    this._metrics.forEach((metric) =>
    {
      this._node.unsubscribe({ topic: metric.topic });
    });
    return this;
  },
  
  _processMetric: function(idx, event)
  {
    let metric = this._metrics[idx];
    this._values[idx].update(event[metric.key]);
    if (metric.chemistry)
    {
      let v = event.v;;
      for (var i = 0; i < this._curve.length; i++)
      {
        var section = this._curve[i];
        var lV = section.lV * this._cells;
        var hV = section.hV * this._cells;
        if (v >= lV && v < hV)
        {
          this._batteryLevel.update((v - lV) / (hV - lV) * (section.hP - section.lP) + section.lP);
          let value = this._batteryLevel.value();
          if (value !== undefined)
          {
            this._adBattery.publish({ '%': value });
            if (value <= 5)
            {
              this._adShutdown.publish({ shutdown: 'low-battery' });
            }
          }
          break;
        }
      }
    }
  
    var good = true;
    var details = [];
    for (var i = this._metrics.length - 1; i >= 0; i--)
    {
      var value = this._values[i].value();
      metric = this._metrics[i];
      // For batteries, we use the calculated level rather then the absolute
      if (metric.chemistry)
      {
        value = this._batteryLevel.value();
        if (value !== undefined)
        {
          details[i] = { topic: this._node.resolveName(TOPIC_BATTERY.topic), value: value };
        }
      }
      else
      {
        details[i] = { topic: metric.topic, value: value };
      }
      if (value > metric.high || value < metric.low)
      {
        good = false;
      }
    }
    if (details.length > 0)
    {
      this._adHealth.publish(
      {
        good: good,
        status: good ? 'Okay' : 'Poor',
        details: details
      });
    }
  },

  _cpuMonitor: function()
  {
    usage.lookup(process.pid, { keepHistory: true }, (err, result) => {
      let mem = process.memoryUsage();
      this._adCompute.publish(
      {
        'cpu%': result.cpu,
        'mem%': mem.heapUsed * 100 / mem.heapTotal
      });
    });
  }
}

module.exports = health;
