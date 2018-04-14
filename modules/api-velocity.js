'use strict';

const MotionPlanner = require('./motion-planner');

const SERVICE_SETV = { service: 'set_velocity', schema: { velocity: 'Number', time: 'Number', func: 'String' } };
const SERVICE_WAITFOR = { service: 'wait_for_velocity', schema: { compare: 'String', velocity: 'Number' } };
const TOPIC_CURRENT = { topic: 'current_velocity', schema: { velocity: 'Number', target_velocity: 'Number', changing: 'Boolean' } };

function velocity(target, type)
{
  this._target = target;
  this._type = type;
  this._enabled = 0;

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
    if (this._enabled++ === 0)
    {
      this._adPos = this._target._node.advertise(TOPIC_CURRENT);
      this._target._node.service(SERVICE_SETV, (request) =>
      {
        switch (request.func)
        {
          case 'idle':
            this._target.idle();
            break;
          case 'brake':
            this._target.brake();
            break;
          default:
            this._target.setVelocity(request.velocity, request.time, MotionPlanner[request.func]);
            break;
        }
        return true;
      });
      this._target._node.service(SERVICE_WAITFOR, (event) =>
      {
        return this._target.waitForVelocity(event.compare, event.velocity);
      });
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._target._node.unservice(SERVICE_SETV);
      this._target._node.unservice(SERVICE_WAITFOR);
      this._target._node.unadvertise(TOPIC_CURRENT);
    }
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
