console.info('Loading Car.');

// Heartbeat
const NOHEARTBEAT = 0;
const HEARTBEAT = 1;
const WAITINGHEARTBEAT = 2;

const TOPIC_SHUTDOWN = { topic: 'shutdown' };
const SERVICE_MOVEMENT = { service: 'set_movement' };
const SERVICE_GESTURE = { service: 'execute_gesture' };


function car(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  this._axleRoot = config.axle;
  this._velocityScale = config.velocityScale || 1.0;

  this._forwardVelocityTarget = 0;
  this._strafeVelocityTarget = 0;
  this._steeringAngleTarget = 0;
}

car.prototype =
{
  enable: function()
  {
    this._node.service(SERVICE_MOVEMENT, (movement) =>
    {
      this._handleMovement(movement);
    });
    this._node.service(SERVICE_GESTURE, (gesture) =>
    {
      this._handleGesture(gesture);
    });
    this._shTopic = this._node.advertise(TOPIC_SHUTDOWN);
    process.on('exit', () =>
    {
      this._shTopic.publish({ shutdown: 'exit' });
    });
    this._axle =
    {
      set_velocity: this._node.proxy({ service: `${this._axleRoot}/set_velocity`}),
      set_angle: this._node.proxy({ service: `${this._axleRoot}/set_angle`})
    };
    this._startHeartbeat();
    return this;
  },

  disable: function()
  {
    this._stopHeartbeat();
    this._shTopic.publish({ shutdown: 'terminated' });
    this._node.unadvertise(TOPIC_SHUTDOWN);    
    this._node.unservice(SERVICE_MOVEMENT);
    this._node.unservice(SERVICE_GESTURE);
    return this;
  },

  _handleMovement: function(movement)
  {
    this._heartbeat();
  
    switch (movement.action)
    {
      case 'forward':
        this.velocityTarget('forward', movement.value);
        break;

      case 'strafe':
        this.velocityTarget('strafe', movement.value);
        break;

      default:
        break;
    }
  },

  _handleGuesture: function(gesture)
  {
    this._heartbeat();

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
  },

  velocityTarget: function(name, velocity)
  {
    switch (name)
    {
      case 'forward':
        this._forwardVelocityTarget = velocity;
        break;

      case 'strafe':
        this._strafeVelocityTarget = velocity;
        break;

      default:
        break;
    }

    // Calculate steering angle.
    // Put wheels in the center position when not moving forwards.
    if (this._forwardVelocityTarget === 0)
    {
      this._steeringAngleTarget = Math.PI / 2;
    }
    else
    {
      this._steeringAngleTarget = Math.abs(Math.atan2(this._forwardVelocityTarget, this._strafeVelocityTarget));
    }
    this._axle.set_velocity(this._forwardVelocityTarget * this._velocityScale);
    this._axle.set_angle(this._steeringAngleTarget);
  }
}

module.exports = car;
