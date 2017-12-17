'use strict';

const SERVICE_IDLE = { service: 'set_idle' };
const SERVICE_SETVEL = { service: 'set_velocity' };
const SERVICE_WAITFOR = { service: 'wait_for_velocity' };
const TOPIC_CURVEL = { topic: 'current_velocity', latching: true };

function motor(config, settings)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  this._settings = settings;
  this._hbridge = config.hbridge;
  this._scale = config.reverse ? -1 : 1;
  this._last = null;
  this._enabled = false;
  this._hbridge.setCyclePeriod(this._settings.periodMs);
}

motor.prototype =
{
  getSettings: function()
  {
    return this._settings;
  },

  setVelocity: function(velocity, timeMs)
  {
    if (this._enabled && velocity !== this._last)
    {
      this._hbridge.setVelocity(velocity * this._scale, timeMs);
      this._last = velocity;
      this._changing();
    }
  },

  brake: function()
  {
    if (this._enabled)
    {
      this._hbridge.brake();
      this._last = 0;
      this._changing();
    }
  },

  getCurrentVelocity: function()
  {
    return this._hbridge.getCurrentVelocity() * this._scale;
  },

  isChanging: function()
  {
    return this._hbridge.isChanging();
  },

  waitForVelocity: function(compare, velocity)
  {
    return new Promise((resolve, reject) =>
    {
      if (compare !== '>=' && compare !== '<=' && compare !== '==' && compare !== 'idle')
      {
        return reject(new Error('Bad compare: ' + compare));
      }
      let check = () =>
      {
        let current = this.getCurrentVelocity();
        let changing = this.isChanging();
        if (compare === '>=' && current >= velocity)
        {
          return resolve(true);
        }
        else if (compare === '<=' && current <= velocity)
        {
          return resolve(true);
        }
        else if (compare === '==' && current == velocity)
        {
          return resolve(true);
        }
        else if (!changing)
        {
          return resolve(compare === 'idle' ? true : false);
        }
        else
        {
          setTimeout(check, 100);
        }
      }
      check();
    });
  },

  enable: function()
  {
    this._enabled = true;
    this._hbridge.enable();
    this._adVel = this._node.advertise(TOPIC_CURVEL);
    this._node.service(SERVICE_SETVEL, (request) =>
    {
      this.setVelocity(request.velocity, request.time);
      return true;
    });
    this._node.service(SERVICE_IDLE, (event) =>
    {
      this.idle(event.idle);
      return true;
    });
    this._node.service(SERVICE_WAITFOR, (event) =>
    {
      return this.waitForVelocity(event.compare, event.velocity);
    });
    return this;
  },

  disable: function()
  {
    this._enabled = false;
    this._hbridge.disable();
    this._node.unadvertise(TOPIC_CURVEL);
    this._node.unservice(SERVICE_IDLE);
    this._node.unservice(SERVICE_SETVEL);
    this._node.unservice(SERVICE_WAITFOR);
    return this;
  },

  idle: function(idle)
  {
    this._hbridge.idle(idle);
  },

  _changing: function()
  {
    clearInterval(this._adtimer);
    this._adtimer = setInterval(() =>
    {
      let changing = this.isChanging();
      this._adVel.publish({ velocity: this.getCurrentVelocity(), target_velocity: this._last, changing: changing });
      if (!changing)
      {
        clearInterval(this._adtimer);
      }
    }, 20);
  }
};

module.exports = motor;
