'use strict';

console.info('Loading PCA9685 controllers.');

const MotionPlanner = require('modules/motion-planner');
const ConfigManager = require('modules/config-manager');

const SERVICE_SETPULSE = { service: 'set_pulse', schema: { pulse: 'Number', duty: 'Number', time: 'Number', func: [ 'linear', 'ease_in', 'ease_inout', 'ease_out', 'idle' ] } };
const SERVICE_WAITFOR = { service: 'wait_for', schema: { compare: [ '==', '<=', '>=', 'idle' ], pulse: 'Number', duty: 'Number' } };
const TOPIC_CURRENT = { topic: 'current_pulse', schema: { pulse: 'Number', target_pulse: 'Number', duty: 'Number', target_duty: 'Number', changing: 'Boolean' } };


function pwmChannel(pwm, subaddress, doApi)
{
  this._pwm = pwm;
  this._subaddress = subaddress;
  this._doApi = doApi || false;
  this._node = Node.init(`${pwm._name}/${subaddress}/node`);
  this._enabled = 0;
  this._planner = new MotionPlanner();
  this._plans = [];
  this._currentMs = null;
  this._lastMs = null;
  this._friendlyName = null;
}

pwmChannel.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      if (this._doApi)
      {
        this._adPos = this._node.advertise(Object.assign({ friendlyName: this._friendlyName }, TOPIC_CURRENT));
        this._node.service(Object.assign({ friendlyName: this._friendlyName }, SERVICE_SETPULSE), (request) =>
        {
          if (request.func === 'idle')
          {
            this.idle();
          }
          else if ('duty' in request)
          {
            this.setDutyCycle(request.duty, request.time, MotionPlanner[request.func]);
          }
          else
          {
            this.setPulse(request.pulse, request.time, MotionPlanner[request.func]);
          }
          return true;
        });
        this._node.service(Object.assign({ friendlyName: this._friendlyName }, SERVICE_WAITFOR ), (event) =>
        {
          let pulse;
          if (duty in event)
          {
            pulse = event.duty * this._pwm._cycleMs;
          }
          else
          {
            pulse = event.pulse;
          }
          return this.waitForPulse(event.compare, pulse);
        });
      }
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      if (this._plans.length === 0)
      {
        this._pwm._setPulseMs(this._subaddress, 0);
      }
      if (this._doApi)
      {
        this._adPos = null;
        this._node.unadvertise(TOPIC_CURRENT);
        this._node.unservice(SERVICE_SETPULSE);
        this._node.unservice(SERVICE_WAITFOR);
      }
    }
    return this;
  },

  setFriendlyName: function(name)
  {
    this._friendlyName = name;
  },
  
  setPulse: function(onMs, periodMs, func)
  {
    this.setPlan(
    [
      {
        end: onMs,
        func: func,
        time: periodMs || 0
      }
    ]);
  },

  setPlan: function(steps)
  {
    if (this._enabled)
    {
      if (this._lastMs === null)
      {
        this._lastMs = steps[0].end;
        steps[0].time = 0;
      }
      let plan = this._planner.generate(
      {
        start: this._lastMs,
        cycle: this._pwm._cycleMs,
        steps: steps
      });
      this._lastMs = steps[steps.length - 1].end;
      this._enqueue({ movement: plan });
    }
  },

  setDutyCycle: function(fraction, periodMs, func)
  {
    if (fraction < 0)
    {
      fraction = 0;
    }
    else if (fraction > 1)
    {
      fraction = 1;
    }
    this.setPulse(fraction * this._pwm._cycleMs, periodMs, func);
  },
  
  getCurrentPulse: function()
  {
    return this._currentMs;
  },

  getTargetPulse: function()
  {
    return this._lastMs;
  },

  getCurrentDuty: function()
  {
    return this._currentMs / this._pwm._cycleMs;
  },

  getTargetDuty: function()
  {
    return this._lastMs / this._pwm.cycleMs;
  },

  idle: function()
  {
    if (this._currentMs !== 0)
    {
      this._enqueue({ idle: true });
    }
  },
  
  getCyclePeriod: function()
  {
    return this._pwm._cycleMs;
  },

  isPulseChanging: function()
  {
    return this._plans.length > 0;
  },

  waitForPulse: function(compare, pulse)
  {
    return new Promise((resolve, reject) =>
    {
      if (compare !== '>=' && compare !== '<=' && compare !== '==' && compare !== 'idle')
      {
        return reject(new Error('Bad compare: ' + compare));
      }
      const check = () =>
      {
        const current = this.getCurrentPulse();
        const changing = this.isPulseChanging();
        if (compare === '>=' && current >= pulse)
        {
          return resolve(true);
        }
        else if (compare === '<=' && current <= pulse)
        {
          return resolve(true);
        }
        else if (compare === '==' && current == pulse)
        {
          return resolve(true);
        }
        else if (!changing)
        {
          return resolve(compare === 'idle' ? true : false);
        }
        else
        {
          setTimeout(check, 20);
        }
      }
      check();
    });
  },

  _enqueue: function(plan)
  {
    this._plans.push(plan);
    if (this._plans.length === 1)
    {
      const run = () => {
        if (!this._enabled)
        {
          this._pwm._setPulseMs(this._subaddress, 0);
        }
        else if (this._plans.length > 0)
        {
          const plan = this._plans[0];
          if ('idle' in plan)
          {
            if (plan.idle)
            {
              this._currentMs = 0;
              this._pwm._setPulseMs(this._subaddress, 0);
              if (this._adPos)
              {
                this._adPos.publish({ pulse: this._currentMs, target_pulse: this._lastMs, duty: this._currentMs / this._pwm._cycleMs, target_duty: this._lastMs / this._pwm._cycleM, changing: this._plans.length > 0 });
              }
            }
            this._plans.shift();
            run();
          }
          else if ('movement' in plan)
          {
            this._planner.execute(plan.movement, this._pwm._cycleMs,
              (value) => {
                this._currentMs = value;
                this._pwm._setPulseMs(this._subaddress, this._currentMs);
                if (this._adPos)
                {
                  this._adPos.publish({ pulse: this._currentMs, target_pulse: this._lastMs, duty: this._currentMs / this._pwm._cycleMs, target_duty: this._lastMs / this._pwm._cycleM, changing: this._plans.length > 0 });
                }
              },
              () => {
                this._plans.shift();
                run();
              }
            );
          }
        }
      }
      run();
    }
  }
};

function PWM(config)
{
  this._i2c = config.i2c;
  this._name = `/i2c/${this._i2c.id()}${config.name || '/pwm'}`;
  this._node = Node.init(`${this._name}/node`);
  this._enabled = 0;
  const cenabled = {};
  this._channels = [];
  const exclude = config.excludeApi || [];
  for (let i = 0; i < 16; i++)
  {
    const api = exclude.indexOf(i) === -1;
    if (api)
    {
      cenabled[`channel${i}`] = '';
    }
    this._channels.push(new pwmChannel(this, i, api));
  }
  this._config = new ConfigManager(this, Object.assign({
    prescaleTweak: config.prescaleTweak || 0,
    cycleMs: config.cycleMs || 20
  }, cenabled));

  this._config.enable();
}

PWM.prototype =
{
  _setCyclePeriod: function()
  {
    this._cycleMs = this._config.get('cycleMs');
    this._tick = this._cycleMs / (4096 - 1);
    const prescale = (Math.round((25 * 1000 * 1000 * this._cycleMs) / (4096 * 1000)) - 1 + this._config.get('prescaleTweak')) & 0xFF;                  
    this._i2c.writeBytes(Buffer.from([ 0x00, 0x20 | 0x10 ]));
    this._i2c.writeBytes(Buffer.from([ 0x01, 0x04 ]));
    this._i2c.writeBytes(Buffer.from([ 0xFE, prescale ]));
    this._i2c.writeBytes(Buffer.from([ 0x00, 0x20 ]));
  },

  _setPulseMs: function(subaddress, pulseMs)
  {
    const v = pulseMs / this._tick;
    this._i2c.writeBytes(Buffer.from([ 6 + 4 * subaddress, 0, 0, v & 0xFF, (v >> 8) & 0xFF ]));
  },

  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._setCyclePeriod();
      for (let i = 0; i < 16; i++)
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
      for (let i = 0; i < 16; i++)
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
    this._setCyclePeriod();
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

  open: function(config)
  {
    if (config.channel >= 0 && config.channel < this._channels.length)
    {
      return this._channels[config.channel];
    }
    throw new Error('Bad Servo channel');
  }
};

module.exports = PWM;
