'use strict';

console.info('Loading DRV8833 H-Bridge controllers.');

const ConfigManager = require('modules/config-manager');

const SERVICE_SETDUTY = { service: 'set_duty', schema: { duty: 'Number', time: 'Number', func: 'String' } };
const SERVICE_WAITFOR = { service: 'wait_for', schema: { compare: 'String', duty: 'Number' } };
const TOPIC_CURRENT = { topic: 'current_duty', schema: { duty: 'Number', target_duty: 'Number', changing: 'Boolean' } };


function hbridgeChannel(config)
{
  this._name = config.name;
  this._node = Node.init(this._name);
  this._in1 = config.in1;
  this._in2 = config.in2;
  this._enabled = 0;
  this._targetDuty = null;
  this._friendlyName = null;
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
      this._adPos = this._node.advertise(Object.assign({ friendlyName: this._friendlyName }, TOPIC_CURRENT));
      this._node.service(Object.assign({ friendlyName: this._friendlyName }, SERVICE_SETDUTY), (request) =>
      {
        switch (request.func)
        {
          case 'idle':
            this.idle();
            break;
          case 'brake':
            this.brake(request.time);
            break;
          default:
            this.setDuty(request.duty, request.time, MotionPlanner[request.func]);
            break;
        }
        return true;
      });
      this._node.service(Object.assign({ friendlyName: this._friendlyName }, SERVICE_WAITFOR), (event) =>
      {
        if (event.duty >= 0)
        {
          return this._in1.waitForPulse(event.compare, Math.min(1.0, event.duty));
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
          return this._in2.waitForPulse(swap[event.compare], -Math.max(-1.0, event.duty));
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
      this._node.unadvertise(TOPIC_CURRENT);
      this._node.unservice(SERVICE_SETDUTY);
      this._node.unservice(SERVICE_WAITFOR);
    }
    return this;
  },

  setFriendlyName: function(name)
  {
    this._friendlyName = name;
  },

  setDuty: function(duty, changeMs, func)
  {
    if (duty === 0)
    {
      this._in1.setDutyCycle(0, changeMs, func);
      this._in2.setDutyCycle(0, changeMs, func);
    }
    else if (duty > 0)
    {
      this._in1.setDutyCycle(Math.min(1.0, duty), changeMs, func);
      this._in2.setDutyCycle(0, changeMs, func);
    }
    else
    {
      this._in1.setDutyCycle(0, changeMs, func);
      this._in2.setDutyCycle(-Math.max(-1.0, duty), changeMs, func);
    }
    this._targetDuty = duty;
  },

  getCurrentDuty: function()
  {
    return this._in1.getCurrentDuty();
  },

  getTargetDuty: function()
  {
    return this._targetDuty;
  },

  idle: function()
  {
    this._in1.idle();
    this._in2.idle();
  },

  brake: function(durationMs)
  {
    // Brake immediately
    this._in1.setDutyCycle(1, 0, null);
    this._in2.setDutyCycle(1, 0, null);
    // If we have a duration, hold the brake for the given time before allowing
    // the next change.
    if (durationMs)
    {
      this._in1.setDutyCycle(1, durationMs, null);
      this._in2.setDutyCycle(1, durationMs, null);
    }
  },
  
  getCyclePeriod: function()
  {
    return this._in1.getCyclePeriod();
  },

  isDutyChanging: function()
  {
    return this._in1.isPulseChanging() || this._in2.isPulseChanging();
  }
};

function hbridge(config)
{
  this._name = config.name;
  this._node = Node.init(`${this._name}/node`);
  this._enabled = 0;
  this._channels =
  [
    new hbridgeChannel(
    {
      name: `${config.name}/a/node`,
      in1: config.ain1,
      in2: config.ain2
    }),
    new hbridgeChannel(
    {
      name: `${config.name}/b/node`,
      in1: config.bin1,
      in2: config.bin2
    })
  ];

  this._config = new ConfigManager(this,
  {
    channel0: '',
    channel1: ''
  });
  this._config.enable();
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
  },

  enable: function()
  {
    if (this._enabled++ === 0)
    {
      for (let i = 0; i < 2; i++)
      {
        const name = this._config.get(`channel${i}`);
        if (name && name.trim())
        {
          this._channels[i].setFriendlyName(name);
          this._channels[i].enable();
        }
      }
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      for (let i = 0; i < 2; i++)
      {
        const name = this._config.get(`channel${i}`);
        if (name && name.trim())
        {
          this._channels[i].disable();
        }
      }
    }
    return this;
  },

  reconfigure: function(changes)
  {
    for (let key in changes)
    {
      if (key.substring(0, 7) === 'channel')
      {
        const channel = this._channels[key.substring(7)];
        const name = changes[key].new;
        const old = changes[key].old;
        if (old && old.trim())
        {
          channel.disable();
        }
        if (name && name.trim())
        {
          channel.setFriendlyName(name);
          channel.enable();
        }
      }
    }
  },
};

module.exports = hbridge;
