'use strict';

console.info('Loading Health Monitor.');

const usage = require('usage');
const childProcess = require('child_process');
const filters = require('./filters');
const ConfigManager = require('modules/config-manager');

const batteryChemistry =
{
  DC:
  {
    curve:
    [
      { hV: 99.00, lV:  0, hP: 100, lP: 100 },
    ]
  },
  LiFeO4:
  {
    curve:
    [
      { hV: 99.00, lV:  4.40, hP: 100, lP: 100 },
      { hV:  4.40, lV:  4.10, hP: 100, lP:  95 },
      { hV:  4.13, lV:  4.03, hP:  95, lP:  20 },
      { hV:  4.03, lV:  3.20, hP:  20, lP:   0 } 
    ]
  },
  LiPo:
  {
    curve:
    [
      { hV: 99.00, lV:  4.20, hP: 100, lP: 100 },
      { hV:  4.20, lV:  4.03, hP: 100, lP:  76 },
      { hV:  4.03, lV:  3.86, hP:  76, lP:  52 },
      { hV:  3.86, lV:  3.83, hP:  52, lP:  42 },
      { hV:  3.83, lV:  3.79, hP:  42, lP:  30 },
      { hV:  3.79, lV:  3.70, hP:  30, lP:  11 },
      { hV:  3.70, lV:  3.60, hP:  11, lP:   5 },
      { hV:  3.60, lV:  3.30, hP:   5, lP:   0 },
      { hV:  3.30, lV:  0.00, hP:   0, lP:   0 }
    ]
  },
  Eneloop:
  {
    curve:
    [
      { hV: 99.00, lV:  1.40, hP: 100, lP: 100 },
      { hV:  1.40, lV:  1.30, hP: 100, lP:  75 },
      { hV:  1.30, lV:  1.28, hP:  75, lP:  50 },
      { hV:  1.28, lV:  1.25, hP:  50, lP:  12 },
      { hV:  1.25, lV:  1.20, hP:  12, lP:   1 },
      { hV:  1.20, lV:  1.10, hP:   1, lP:   0 },
      { hV:  1.10, lV:  0.00, hP:   0, lP:   0 }
    ]
  },
  Alkaline:
  {
    curve:
    [
      { hV: 99.00, lV:  1.49, hP: 100, lP: 100 },
      { hV:  1.49, lV:  1.35, hP: 100, lP:  90 },
      { hV:  1.35, lV:  1.27, hP:  90, lP:  80 },
      { hV:  1.27, lV:  1.20, hP:  80, lP:  70 },
      { hV:  1.20, lV:  1.16, hP:  70, lP:  60 },
      { hV:  1.16, lV:  1.12, hP:  60, lP:  50 },
      { hV:  1.12, lV:  1.10, hP:  50, lP:  40 },
      { hV:  1.10, lV:  1.08, hP:  40, lP:  30 },
      { hV:  1.08, lV:  1.04, hP:  30, lP:  20 },
      { hV:  1.04, lV:  0.98, hP:  20, lP:  10 },
      { hV:  0.98, lV:  0.62, hP:  10, lP:   0 },
      { hV:  0.62, lV:  0.00, hP:   0, lP:   0 }
    ]
  }
};

const TOPIC_COMPUTE = { topic: 'compute', schema: { 'cpu%': 'Number', 'mem%': 'Number' } };
const TOPIC_BATTERY = { topic: 'battery', schema: { '%': 'Number', v: 'Number' } };
const TOPIC_SHUTDOWN = { topic: 'shutdown', schema: { 'reason': 'String' } };

function health(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._config = new ConfigManager(this,
  {
    chemistry: config.battery.chemistry || 'DC',
    cells: config.battery.cells || 1
  });
  this._battery =
  {
    topic: config.battery.topic,
    level: filters.Median(5),
    minV: config.minV || 0,
    critical: 5
  };
}

health.prototype =
{
  enable: function()
  {
    this._config.enable();
    this._battery.curve = batteryChemistry[this._config.get('chemistry')].curve;
    this._battery.cells = this._config.get('cells');

    this._node.subscribe({ topic: this._battery.topic }, (event) => 
    {
      this._processBattery(event);
    });
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
    this._node.unsubscribe({ topic: this._battery.topic });
    this._config.disable();
  
    return this;
  },
  
  _processBattery: function(event)
  {
    this._battery.level.update(event.v);
    let v = this._battery.level.value();
    for (var i = 0; i < this._battery.curve.length; i++)
    {
      var section = this._battery.curve[i];
      var lV = section.lV * this._battery.cells;
      var hV = section.hV * this._battery.cells;
      if (v >= lV && v < hV)
      {
        let value = section.lP + ((v - lV) / (hV - lV) * (section.hP - section.lP));
        this._adBattery.publish({ '%': value, v: v });
        if (value <= this._battery.critical)
        {
          // Battery will fail when it get's empty
          this._adShutdown.publish({ reason: 'battery-critical' });
          // Shutdown to save the battery
          childProcess.spawn('/sbin/shutdown', [ '-h', '+1' ], {});
        }
        break;
      }
    }
    if (v < this._battery.minV)
    {
      // System power will fail when voltage gets too low
      this._adShutdown.publish({ reason: 'voltage-critical' });
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
