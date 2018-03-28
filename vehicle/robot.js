'use strict';

console.info('Loading Robot.');

const PI   = Math.PI;
const PId2 = PI / 2;
const PIx2 = PI * 2;

// robot modes
const DISABLED = 0;
const ACTIVE = 1;
const SHUTDOWN = 3;

// Heartbeat
const NOHEARTBEAT = 0;
const HEARTBEAT = 1;
const WAITINGHEARTBEAT = 2;

const IDLE_TIMEOUT = 60 * 60 * 1000; // 60 minutes

const TOPIC_SHUTDOWN = { topic: 'shutdown', schema: { reason: 'String' } };
const SERVICE_MOVEMENT = { service: 'set_movement', schema: { action: 'String', forward: 'Number', strafe: 'Number' } };
const SERVICE_GESTURE = { service: 'execute_gesture', schema: { action: 'String' } };


function robot(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);

  this._wheels = config.wheels || {};
  this._servos = config.servos || {};
  this._buttons = config.buttons || {};
  this._buttonCallbacks = {};
  this._buttonChanges = {};

  this._brain = new config.brain(this);

  this._velocity = { forward: 0, strafe: 0, changed: false };
  this._heartbeat = NOHEARTBEAT;
  this._lastInteraction = Date.now();
}

robot.prototype =
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
      this._shTopic.publish({ reason: 'exit' });
    });

    for (var id in this._wheels)
    {
      this._wheels[id].enable();
    }
    for (var id in this._servos)
    {
      this._servos[id].enable();
      this._servos[id].idle(true);
    }
    for (var id in this._buttons)
    {
      this._buttons[id].enable();
    }
    this._heartbeatTimer = setInterval(() =>
    {
      if (Date.now() - this._lastInteraction > IDLE_TIMEOUT)
      {
        this._brain.gesture('Sleep');
      }
      else switch (this._heartbeat)
      {
        case NOHEARTBEAT:
          break;

        case HEARTBEAT:
          this._heartbeat = WAITINGHEARTBEAT;
          break;

        case WAITINGHEARTBEAT:
        default:
          this._heartbeat = NOHEARTBEAT;
          this._velocity.forward = 0;
          this._velocity.strafe = 0;
          this._velocity.changed = true;
          this._brain.gesture('Idle');
          break;
      }
    }, 1000);

    this._brain.enable();

    return this;
  },
  
  disable: function()
  {
    this._brain.disable();
  
    for (var id in this._wheels)
    {
      this._wheels[id].disable();
    }
    for (var id in this._servos)
    {
      this._servos[id].disable();
    }
    for (var id in this._buttons)
    {
      this._buttons[id].disable();
    }
    this._shTopic.publish({ reason: 'terminated' });
    this._node.unadvertise(TOPIC_SHUTDOWN);    
    this._node.unservice(SERVICE_MOVEMENT);
    this._node.unservice(SERVICE_GESTURE);

    clearInterval(this._heartbeatTimer);

    return this;
  },

  velocityActual: function(name, velocity)
  {
    if (name in this._velocity)
    {
      if (velocity !== undefined)
      {
        if (velocity !== this._velocity[name])
        {
          this._velocity[name] = velocity;
          this._velocity.changed = true;
        }
        return true;
      }
      else
      {
        return this._velocity[name];
      }
    }
    else
    {
      return 0;
    }
  },

  wheelActual: function(name, velocity, time, func)
  {
    let wheel = this._wheels[name];
    if (wheel)
    {
      if (velocity !== undefined)
      {
        return wheel.setVelocity(velocity, time, func);
      }
      else
      {
        return wheel.getTargetVelocity();
      }
    }
    else
    {
      return 0;
    }
  },

  wheelIsChanging: function(name)
  {
    let wheel = this._wheels[name];
    if (wheel)
    {
      return wheel.isVelocityChanging();
    }
    else
    {
      return false;
    }
  },

  servoIdle: function(name, idle)
  {
    let servo = this._servos[name];
    if (servo)
    {
      servo.idle(idle);
      return true;
    }
    else
    {
      return false;
    }
  },

  servoIsChanging: function(name)
  {
    let servo = this._servos[name];
    if (servo)
    {
      return servo.isAngleChanging();
    }
    else
    {
      return false;
    }
  },

  servoActual: function(name, angle, time, func)
  {
    let servo = this._servos[name];
    if (servo)
    {
      if (angle !== undefined)
      {
        servo.setAngle(angle, time, func);
      }
      return servo.getTargetAngle();
    }
    else
    {
      return 0;
    }
  },

  servoActualWait: function(name, compare, angle)
  {
    let servo = this._servos[name];
    if (servo)
    {
      return servo.waitForAngle(compare, angle);
    }
    else
    {
      return false;
    }
  },

  buttonOnChange: function(name, callback)
  {
    if (!this._buttonCallbacks[name])
    {
      this._buttonCallbacks[name] = [];
      this._node.subscribe({ topic: this._buttons[name]._node.resolveName('button_state') }, (event) =>
      {
        const now = Date.now();
        this._lastInteraction = now;
        this._buttonChanges[name] = { value: event.button_state, time: now };
        this._buttonCallbacks[name].forEach((callback) =>
        {
          callback(event.button_state);
        });
      });
    }
    this._buttonCallbacks[name].push(callback);
  },

  buttonLastChange: function(name)
  {
    let button = this._buttonChanges[name];
    if (button)
    {
      return { value: button.value, duration: (Date.now() - button.time) / 1000 };
    }
    else
    {
      if (!this._buttonCallbacks[name])
      {
        this.buttonOnChange(name, () => {});
      }
      return {};
    }
  },

  _handleMovement: function(movement)
  {
    this._heartbeat = HEARTBEAT;
    this._lastInteraction = Date.now();
  
    switch (movement.action)
    {
      case 'movement':
        if ('forward' in movement)
        {
          this.velocityActual('forward', movement.forward);
        }
        if ('strafe' in movement)
        {
          this.velocityActual('strafe', movement.strafe);
        }
        break;

      default:
        break;
    }
  },

  _handleGesture: function(gesture)
  {
    this._heartbeat = HEARTBEAT;
    this._lastInteraction = Date.now();

    this._brain.gesture(gesture.action);
  }
};

module.exports = robot;
