'use strict';

const MotionPlanner = require('./motion-planner');

const SERVICE_IDLE = { service: 'set_idle' };
const SERVICE_SETV = { service: 'set_velocity' };
const SERVICE_BRAKE = { service: 'set_brake' };
const SERVICE_WAITFOR = { service: 'wait_for_velocity' };
const TOPIC_CURRENT = { topic: 'current_velocity', latching: true };

function velocity(target)
{
  this._target = target;

  const targetSetVelocity = this._target.setVelocity;
  this._target.setVelocity = (velocity, changeMs, func) => {
    targetSetVelocity.call(this._target, velocity, changeMs, func);
    this._changing(velocity);
  }

  const targetBrake = this._target.brake;
  this._target.brake = () => {
    targetBrake.call(this._target);
    this._changing(0);
  }
}

velocity.prototype =
{
  enable: function()
  {
    this._adPos = this._target._node.advertise(TOPIC_CURRENT);
    this._target._node.service(SERVICE_SETV, (request) =>
    {
      this._target.setVelocity(request.velocity, request.time, MotionPlanner[request.func]);
      return true;
    });
    this._target._node.service(SERVICE_BRAKE, (event) =>
    {
      this._target.brake();
      return true;
    });
    this._target._node.service(SERVICE_IDLE, (event) =>
    {
      this._target.idle(event.idle);
      return true;
    });
    this._target._node.service(SERVICE_WAITFOR, (event) =>
    {
      return this._target.waitForVelocity(event.compare, event.velocity);
    });
    return this;
  },

  disable: function()
  {
    this._target._node.unservice(SERVICE_IDLE);
    this._target._node.unservice(SERVICE_BRAKE);
    this._target._node.unservice(SERVICE_SETV);
    this._target._node.unservice(SERVICE_WAITFOR);
    this._target._node.unadvertise(TOPIC_CURRENT);
    return this;
  },

  _changing: function(targetVelocity)
  {
    clearInterval(this._adtimer);
    this._adtimer = setInterval(() =>
    {
      let changing = this._target.isVelocityChanging();
      this._adPos.publish({ velocity: this._target.getCurrentVelocity(), target_velocity: targetVelocity, changing: changing });
      if (!changing)
      {
        clearInterval(this._adtimer);
      }
    }, 20);
  }
};

module.exports = velocity;
