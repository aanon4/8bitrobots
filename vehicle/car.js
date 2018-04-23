console.info('Loading Car.');

// Heartbeat
const NOHEARTBEAT = 0;
const HEARTBEAT = 1;
const WAITINGHEARTBEAT = 2;

const TOPIC_SHUTDOWN = { topic: 'shutdown', schema: { reason: 'String' } };
const SERVICE_GESTURE = { service: 'execute_gesture', schema: { action: 'String' } };


function car(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._axleRoot = config.axle;
  this._joystick = config.joystick;
  this._forward = 0;
  this._strafe = 0;
}

car.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._node.service(SERVICE_GESTURE, (gesture) => {
        this._heartbeat();
        this._handleGesture(gesture);
      });
      this._node.subscribe({ topic: this._joystick }, (event) => {
        this._heartbeat();
        this._handleMovement(event.x, event.y);
      });
      this._shTopic = this._node.advertise(TOPIC_SHUTDOWN);
      process.on('exit', () => {
        this._shTopic.publish({ reason: 'exit' });
      });
      this._axle =
      {
        set_velocity: this._node.proxy({ service: `${this._axleRoot}/set_velocity`}),
        set_angle: this._node.proxy({ service: `${this._axleRoot}/set_angle`})
      };
      this._startHeartbeat();
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._stopHeartbeat();
      this._shTopic.publish({ reason: 'terminated' });
      this._node.unadvertise(TOPIC_SHUTDOWN);
      this._node.unsubscribe({ topic: this._joystick });
      this._node.unservice(SERVICE_GESTURE);
    }
    return this;
  },

  _handleMovement: function(x, y)
  {
    this._forward = Math.min(Math.max(y, -1), 1);
    this._strafe = Math.min(Math.max(x, -1), 1);
    if (this._forward === 0 && this._strafe === 0)
    {
      this._axle.set_velocity({ func: 'idle' });
      this._axle.set_angle({ func: 'idle' });
    }
    else
    {
      // Velocity is the hypotenuse
      // let velocity = Math.sqrt(forward * forward + strate * strafe);
      // Scale so velocity ramps up slowly
      // velocity = Math.sign(forward) * velocity * velocity; 
      const velocity = (this._forward < 0 ? -1 : 1) * (this._forward * this._forward + this._strafe * this._strafe);
      const angle = Math.atan2(this._forward, this._strafe);

      this._axle.set_velocity({ velocity: velocity });
      this._axle.set_angle({ angle: angle });
    }
  },

  _handleGesture: function(gesture)
  {
    switch (gesture.action)
    {
      case 'manual':
        break;

      case 'autopilot':
        break;

      default:
        break;
    }
  },

  _startHeartbeat: function()
  {
    clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = setInterval(() =>
    {
      switch (this._heartbeatStatus)
      {
        case NOHEARTBEAT:
          break;

        case HEARTBEAT:
          this._heartbeatStatus = WAITINGHEARTBEAT;
          break;

        case WAITINGHEARTBEAT:
        default:
          this._heartbeatStatus = NOHEARTBEAT;
          this._heartbeatLost();
          break;
      }
    }, 1000);
  },

  _stopHeartbeat: function()
  {
    clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = null;
  },

  _heartbeat: function()
  {
    //console.log('heartbeat');
    this._heartbeatStatus = HEARTBEAT;
    this._lastInteraction = Date.now();
  },

  _heartbeatLost: function()
  {
    //console.log('heartbeat lost');
    this._handleMovement(0, 0);
  }
}

module.exports = car;
