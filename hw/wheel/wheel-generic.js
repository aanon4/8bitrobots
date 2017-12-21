'use strict';

const SERVICE_IDLE = { service: 'set_idle' };
const SERVICE_SETV = { service: 'set_velocity' };
const SERVICE_BRAKE = { service: 'set_brake' };
const SERVICE_WAITFOR = { service: 'wait_for_velocity' };
const TOPIC_CURV = { topic: 'current_velocity', latching: true };


function wheel(config, settings)
{
  this._node = rosNode.init(config.name);
  this._config = config;
  this._track = Math.PI * settings.diameter / 1000; // m
  this._motor = config.motor;
}

wheel.prototype =
{
  enable: function()
  {
    this._adCur = this._node.advertise(TOPIC_CURV);
    this._node.service(SERVICE_SETV, (request) =>
    {
      this.setVelocity(request.velocity, request.time);
      return true;
    });
    this._node.service(SERVICE_BRAKE, (event) =>
    {
      this.brake();
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
    this._motor.enable();
    return this;
  },

  disable: function()
  {
    this._motor.disable();
    this._node.unadvertise(TOPIC_CURV);
    this._node.unservice(SERVICE_IDLE);
    this._node.unservice(SERVICE_BRAKE);
    this._node.unservice(SERVICE_SETV);
    this._node.unservice(SERVICE_WAITFOR);
    return this;
  },

  setVelocity: function(velocity, changeMs, func)
  {
    this._motor.setRPM(velocity / this._track, changeMs, func);
  },

  getCurrentVelocity: function()
  {
    return this._motor.getRPM() * this._track;
  },

  brake: function()
  {
    this._motor.brake();
  },

  idle: function(idle)
  {
    this._motor.idle(idle);
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
  }
};

module.exports = wheel;
