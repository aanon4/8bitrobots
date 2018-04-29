'use strict';

console.info('Loading DRV8833 H-Bridge controllers.');

const SERVICE_SETRPM = { service: 'set_rpm', schema: { rpm: 'Number', time: 'Number', func: 'String' } };
const SERVICE_WAITFOR = { service: 'wait_for_rpm', schema: { compare: 'String', velocity: 'Number' } };
const TOPIC_CURRENT = { topic: 'current_rpm', schema: { rpm: 'Number', target_rpm: 'Number', changing: 'Boolean' } };


function hbridgeChannel(config)
{
  this._name = config.name;
  this._node = Node.init(this._name);
  this._in1 = config.in1;
  this._in2 = config.in2;
  this._v = config.v;
  this._enabled = 0;
  this._targetRPM = null;
  this._kV = config.kV || 0;
}

hbridgeChannel.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._in1.enable();
      this._in2.enable();
      this.idle();
      this._adPos = this._node.advertise(TOPIC_CURRENT);
      this._node.service(SERVICE_SETRPM, (request) =>
      {
        switch (request.func)
        {
          case 'idle':
            this.idle();
            break;
          case 'brake':
            this.brake();
            break;
          default:
            this.setRPM(request.rpm, request.time, MotionPlanner[request.func]);
            break;
        }
        return true;
      });
      this._node.service(SERVICE_WAITFOR, (event) =>
      {
        if (event.rpm >= 0)
        {
          return this._in1.waitForPulse(event.compare, Math.min(1.0, event.rpm / this._maxRPM()));
        }
        else
        {
          const swap =
          {
            '>=' : '<=',
            '<=' : '>=',
            '==' : '==',
            'idle' : 'idle'
          };
          return this._in2.waitForPulse(swap[event.compare], -Math.max(-1.0, event.rpm / this._maxRPM()));
        }
      });
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this.idle();
      this._in1.disable();
      this._in2.disable();
    }
    return this;
  },

  setRPM: function(rpm, changeMs, func)
  {
    const maxRPM = this._maxRPM();
    let duty;
    if (rpm === 0 || maxRPM === 0)
    {
      duty = 0;
      this._in1.setDutyCycle(0, changeMs, func);
      this._in2.setDutyCycle(0, changeMs, func);
    }
    else if (rpm > 0)
    {
      duty = Math.min(1.0, rpm / maxRPM);
      this._in1.setDutyCycle(duty, changeMs, func);
      this._in2.setDutyCycle(0, changeMs, func);
    }
    else
    {
      duty = Math.max(-1.0, rpm / maxRPM);
      this._in1.setDutyCycle(0, changeMs, func);
      this._in2.setDutyCycle(-duty, changeMs, func);
    }
    this._targetRPM = maxRPM * duty;
  },

  getCurrentRPM: function()
  {
    const maxRPM = this._maxRPM();
    let pulse = this._in1.getCurrentPulse();
    if (pulse != 0)
    {
      return maxRPM * pulse;
    }
    else
    {
      return -this._in2.getCurrentPulse() * maxRPM;
    }
  },

  _maxRPM: function()
  {
    return this._kV * this._v;
  },

  getTargetRPM: function()
  {
    return this._targetRPM;
  },

  idle: function()
  {
    this._in1.idle();
    this._in2.idle();
  },

  brake: function()
  {
    this._in1.setDutyCycle(1, changeMs, func);
    this._in2.setDutyCycle(1, changeMs, func);
  },

  setKVandPoles: function(kV, poles)
  {
    this._kV = kV;
  },

  setCyclePeriod: function(cycleMs)
  {
    this._in1.setCyclePeriod(cycleMs);
    this._in2.setCyclePeriod(cycleMs);
  },
  
  getCyclePeriod: function()
  {
    return this._in1.getCyclePeriod();
  },

  isRPMChanging: function()
  {
    return this._in1.isPulseChanging() || this._in2.isPulseChanging();
  }
};

function hbridge(config)
{
  this._channels =
  [
    new hbridgeChannel(
    {
      name: `${config.name}/a/node`,
      v: config.v,
      in1: config.ain1,
      in2: config.ain2
    }),
    new hbridgeChannel(
    {
      name: `${config.name}/b/node`,
      v: config.v,
      in1: config.bin1,
      in2: config.bin2
    })
  ];
}

hbridge.prototype =
{
  open: function(config)
  {
    if (config.channel < 0 || config.channel >= this._channels.length)
    {
      throw new Error('Bad hbridge channel');
    }
    return this._channels[config.channel];
  }
};

module.exports = hbridge;
