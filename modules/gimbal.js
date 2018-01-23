console.info('Loading Gimbal.');

const TOPIC_ORIENTATION_ERROR = { topic: '/pilot/orientation/error' };

function r2d(r)
{
  return r / Math.PI * 180;
}

function gimbal(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);

  function dummy(){}
  this._pan = config.pan || dummy;
  this._tilt = config.tilt || dummy;
  this._roll = config.roll || dummy;

  this._panAngle = 0;
  this._tiltAngle = 0;
  this._rollAngle = 0;
}

gimbal.prototype =
{
  enable: function()
  {
    this._node.subscribe(TOPIC_ORIENTATION_ERROR, (event) =>
    {
      this._process(event);
    });
    return this;
  },

  disable: function()
  {
    this._node.unsubscribe(TOPIC_ORIENTATION_ERROR);
    return this;
  },

  setTilt: function(angle)
  {
    this._tiltAngle = angle;
  },

  setPan: function(angle)
  {
    this._panAngle = angle;
  },

  setRoll: function(angle)
  {
    this._rollAngle = angle;
  },
  
  _process: function(event)
  {
    this._tilt(this._tiltAngle + r2d(event.pitch));
    this._pan(this._panAngle + r2d(event.heading));
    this._roll(this._rollAngle + r2d(event.roll));
  }
};

module.exports = gimbal;
