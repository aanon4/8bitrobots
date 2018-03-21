'use strict';

const MotionPlanner = require('./motion-planner');

const SERVICE_IDLE = { service: 'set_angle_idle', schema: {} };
const SERVICE_SETPOS = { service: 'set_angle', schema: { angle: 'Number', time: 'Number', func: 'String' } };
const SERVICE_WAITFOR = { service: 'wait_for_angle', schema: { compare: 'String', angle: 'Number' } };
const TOPIC_CURRENT = { topic: 'current_angle', schema: { angle: 'Number', target_angle: 'Number', changing: 'Boolean' } };

function angle(target, type)
{
  this._target = target;
  this._type = type;

  const targetSetAngle = this._target.setAngle;
  this._target.setAngle = (angle, changeMs, func) => {
    targetSetAngle.call(this._target, angle, changeMs, func);
    this._changing(angle);
  }
}

angle.prototype =
{
  enable: function()
  {
    this._adPos = this._target._node.advertise(TOPIC_CURRENT);
    if (this._type !== 'topicOnly')
    {
      this._target._node.service(SERVICE_SETPOS, (request) =>
      {
        this._target.setAngle(request.angle, request.time, MotionPlanner[request.func]);
        return true;
      });
      this._target._node.service(SERVICE_IDLE, (event) =>
      {
        this._target.idle();
        return true;
      });
      this._target._node.service(SERVICE_WAITFOR, (event) =>
      {
        return this._target.waitForAngle(event.compare, event.angle);
      });
    }
    return this;
  },

  disable: function()
  {
    if (this._type !== 'topicOnly')
    {
      this._target._node.unservice(SERVICE_IDLE);
      this._target._node.unservice(SERVICE_SETPOS);
      this._target._node.unservice(SERVICE_WAITFOR);
    }
    this._target._node.unadvertise(TOPIC_CURRENT);
    return this;
  },

  _changing: function(targetAngle)
  {
    clearInterval(this._adtimer);
    this._adtimer = setInterval(() =>
    {
      let changing = this._target.isAngleChanging();
      this._adPos.publish({ angle: this._target.getCurrentAngle(), target_angle: targetAngle, changing: changing });
      if (!changing)
      {
        clearInterval(this._adtimer);
      }
    }, 20);
  }
};

module.exports = angle;
