console.info('Loading ROV.');

const PI   = Math.PI;
const PId2 = PI / 2;
const PIx2 = PI * 2;

// Pilot modes
const DISABLED = 0;
const ACTIVE = 1;
const TEST = 2;
const SHUTDOWN = 3;

const SERVICE_CONTROL = { service: 'set_control' };
const TOPIC_ACTIVE = { topic: 'active' };
const TOPIC_ORIENTATION_ERROR = { topic: 'orientation/error' };
const TOPIC_ANGULAR = { topic: '/kinematics/angular' };
const TOPIC_SHUTDOWN = { topic: '/health/shutdown' };


function neutralize01(v)
{
  return v >= -0.01 && v < 0.01 ? 0 : v;
}

function neutralize1(v)
{
  return v >= -0.1 && v < 0.1 ? 0 : v;
}

function pilot(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._kinematics = config.kinematics;
  this._power = config.power;
  
  // Setup the thrusters
  this._thrustersChanged = false;
  this._thrusters = config.thrusters || {};

  // Setup the servos
  this._servosChanged = false;
  this._servos = config.servos || {};

  // Load pilot neural network
  this._pilot = new config.pilot(this);
  
  this._mode = DISABLED;
 
  this._deltaMovement  = { forward: 0, strafe: 0, ascent: 0, pitch: 0, roll: 0, heading: 0, changed: false };
  this._targetMovement = { forward: 0, strafe: 0, ascent: 0, pitch: 0, roll: 0, heading: 0, changed: false };
  this._actualMovement = { forward: 0, strafe: 0, ascent: 0, pitch: 0, roll: 0, heading: 0, changed: false };
}

pilot.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._adOrientationError = this._node.advertise(TOPIC_ORIENTATION_ERROR);
      this._adActive = this._node.advertise(TOPIC_ACTIVE);
      this._node.service(SERVICE_CONTROL, (event) =>
      {
        this._handleEvents(event);
      });
      this._node.subscribe(TOPIC_ANGULAR, (event) =>
      {
        this._updateAngularKinematics(event);
      });
      this._node.subscribe(TOPIC_SHUTDOWN, () =>
      {
        this._shutdownPower();
      });

      this._clock = setInterval(() =>
      {
        this._updateTargets();
      }, 100);

      for (var name in this._thrusters)
      {
        this._thrusters[name].enable();
        this.thrusterActual(name, 0);
      }
      for (var name in this._servos)
      {
        this._servos[name].enable();
        this.servoActual(name, null);
      }

      this._adActive.publish({ active: this._mode });
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      for (var name in this._servos)
      {
        this._servos[name].disable();
      }
      for (var name in this._thrusters)
      {
        this._thrusters[name].disable();
      }

      clearInterval(this._clock);

      this._node.unsubscribe(TOPIC_SHUTDOWN);
      this._node.unsubscribe(TOPIC_ANGULAR);
      this._node.unservice(SERVICE_CONTROL);
      this._node.unadvertise(TOPIC_ORIENTATION_ERROR);
      this._node.unadvertise(TOPIC_ACTIVE);
    }
    return this;
  },

  _handleEvents: function(event)
  {
    switch (event.action)
    {
      case 'thrust.heading': // rotate left/right
        if (this.headingDelta(neutralize01(event.value)) == 0) // -0.1 to 0.1
        {
          this.headingTarget(this.headingActual());
        }
        break;
        
      case 'thrust.pitch': // rotate up/down
        if (this.pitchDelta(neutralize01(event.value)) == 0) // -0.1 to 0.1
        {
          this.pitchTarget(this.pitchActual());
        }
        break;

      case 'thrust.roll': // roll left/right
        if (this.rollDelta(neutralize01(event.value)) == 0) // -0.1 to 0.1
        {
          this.rollTarget(this.rollActual());
        }
        break;

      case 'thrust.forward': // move forward/backward
        this.forwardTarget(neutralize1(event.value)); // -1 to 1
        break;

      case 'thrust.strafe': // move left/right
        this.strafeTarget(neutralize1(event.value));  // -1 to 1
        break;

      case 'thrust.ascent': // move up/down
        this.ascentTarget(neutralize1(event.value));  // -1 to 1
        break;
 
      case 'active':
        if (this._mode == SHUTDOWN)
        {
          break;
        }
        this._mode = event.on ? ACTIVE : DISABLED;
        for (var name in this._thrusters)
        {
          this.thrusterActual(name, 0);
        }
        for (var name in this._servos)
        {
          this.servoActual(name, null);
        }
        if (this._mode == ACTIVE)
        {
          // Set default orientation of craft
          this.forwardDelta(0);
          this.ascentDelta(0);
          this.strafeDelta(0);
          this.headingDelta(0);
          this.pitchDelta(0);
          this.rollDelta(0);
          this.forwardTarget(0);
          this.ascentTarget(0);
          this.strafeActual(0);
          this.headingTarget(this.headingActual());
          this.pitchTarget(0);
          this.rollTarget(0);
        }
        this._adActive.publish({ active: this._mode });
        break;
        
      case 'test':
        if (this._mode == SHUTDOWN)
        {
          break;
        }
        this._mode = TEST;
        for (var name in this._thrusters)
        {
          this.thrusterActual(name, 0);
        }
        for (var name in this._servos)
        {
          this.servoActual(name, null);
        }
        this._testThruster(event.thruster, event.on);
        break;

      default:
        break;
    }

    this._updatePilot();
  },

  forwardDelta: function(v)
  {
    if (v !== undefined && v !== this._deltaMovement.forward)
    {
      this._deltaMovement.forward = v;
      this._deltaMovement.changed = true;
    }
    return this._deltaMovement.forward;
  },

  ascentDelta: function(v)
  {
    if (v !== undefined && v !== this._deltaMovement.ascent)
    {
      this._deltaMovement.ascent = v;
      this._deltaMovement.changed = true;
    }
    return this._deltaMovement.ascent;
  },

  strafeDelta: function(v)
  {
    if (v !== undefined && v !== this._deltaMovement.strafe)
    {
      this._deltaMovement.strafe = v;
      this._deltaMovement.changed = true;
    }
    return this._deltaMovement.strafe;
  },

  headingDelta: function(v)
  {
    if (v !== undefined && v !== this._deltaMovement.heading)
    {
      this._deltaMovement.heading = v;
      this._deltaMovement.changed = true;
    }
    return this._deltaMovement.heading;
  },

  pitchDelta: function(v)
  {
    if (v !== undefined && v !== this._deltaMovement.pitch)
    {
      this._deltaMovement.pitch = v;
      this._deltaMovement.changed = true;
    }
    return this._deltaMovement.pitch;
  },

  rollDelta: function(v)
  {
    if (v !== undefined && v !== this._deltaMovement.roll)
    {
      this._deltaMovement.roll = v;
      this._deltaMovement.changed = true;
    }
    return this._deltaMovement.roll;
  },

  forwardTarget: function(v)
  {
    if (v !== undefined && v !== this._targetMovement.forward)
    {
      this._targetMovement.forward = v;
      this._targetMovement.changed = true;
    }
    return this._targetMovement.forward;
  },

  ascentTarget: function(v)
  {
    if (v !== undefined && v !== this._targetMovement.ascent)
    {
      this._targetMovement.ascent = v;
      this._targetMovement.changed = true;
    }
    return this._targetMovement.ascent;
  },

  strafeTarget: function(v)
  {
    if (v !== undefined && v !== this._targetMovement.strafe)
    {
      this._targetMovement.strafe = v;
      this._targetMovement.changed = true;
    }
    return this._targetMovement.strafe;
  },

  headingTarget: function(v)
  {
    if (v !== undefined && v !== this._targetMovement.heading)
    {
      this._targetMovement.heading = v;
      this._targetMovement.changed = true;
    }
    return this._targetMovement.heading;
  },

  pitchTarget: function(v)
  {
    if (v !== undefined && v != this._targetMovement.pitch)
    {
      this._targetMovement.pitch = v;
      this._targetMovement.changed = true;
    }
    return this._targetMovement.pitch;
  },

  rollTarget: function(v)
  {
    if (v !== undefined && v !== this._targetMovement.roll)
    {
      this._targetMovement.roll = v;
      this._targetMovement.changed = true;
    }
    return this._targetMovement.roll;
  },

  forwardActual: function(v)
  {
    if (v !== undefined && v !== this._actualMovement.forward)
    {
      this._actualMovement.forward = v;
      this._actualMovement.changed = true;
    }
    return this._actualMovement.forward;
  },

  ascentActual: function(v)
  {
    if (v !== undefined && v !== this._actualMovement.ascent)
    {
      this._actualMovement.ascent = v;
      this._actualMovement.changed = true;
    }
    return this._actualMovement.ascent;
  },

  strafeActual: function(v)
  {
    if (v !== undefined && v !== this._actualMovement.strafe)
    {
      this._actualMovement.strafe = v;
      this._actualMovement.changed = true;
    }
    return this._actualMovement.strafe;
  },

  headingActual: function(v)
  {
    if (v !== undefined && v !== this._actualMovement.heading)
    {
      this._actualMovement.heading = v;
      this._actualMovement.changed = true;
    }
    return this._actualMovement.heading;
  },

  pitchActual: function(v)
  {
    if (v !== undefined && v != this._actualMovement.pitch)
    {
      this._actualMovement.pitch = v;
      this._actualMovement.changed = true;
    }
    return this._actualMovement.pitch;
  },

  rollActual: function(v)
  {
    if (v !== undefined && v !== this._actualMovement.roll)
    {
      this._actualMovement.roll = v;
      this._actualMovement.changed = true;
    }
    return this._actualMovement.roll;
  },

  thrusterActual: function(name, thrust)
  {
    let thruster = this._thrusters[name];
    if (thruster)
    {
      if (thrust !== undefined && thrust !== thruster.getCurrentThrust())
      {
        thruster.setThrust(thrust);
      }
      return thruster.getCurrentThrust();
    }
    else
    {
      return 0;
    }
  },

  servoActual: function(name, angle)
  {
    let servo = this._servos[name];
    if (angle !== undefined && angle !== servo.getCurrentAngle())
    {
      servo.setAngle(angle);
    }
    return servo.getCurrentAngle();
  },

  _updateAngularKinematics: function(event)
  {
    if (event.name != this._kinematics)
    {
      return;
    }

    this.pitchActual(event.pitch);
    this.rollActual(event.roll);
    this.headingActual(event.heading);

    this._updatePilot();
  },

  _updateTargets: function()
  {
    function adjust(a)
    {
      return a > PI ? a - PIx2 : a <= -PI ? a + PIx2 : a;
    }
    function limit(a)
    {
      return a > PId2 ? PId2 : a < -PId2 ? -PId2 : a;
    }
    this.pitchTarget(limit(this.pitchTarget() + this.pitchDelta()));
    this.rollTarget(limit(this.rollTarget() + this.rollDelta()));
    this.headingTarget(adjust(this.headingTarget() + this.headingDelta()));
  },

  _updatePilot: function()
  {
    if (this._deltaMovement.changed || this._actualMovement.changed || this._targetMovement.changed)
    {
      this._actualMovement.changed = false;
      this._deltaMovement.changed = false;
      this._targetMovement.changed = false;

      this._updatePilotError();
    
      if (this._mode == ACTIVE)
      {
        this._pilot.run();
      }
    }
  },

  _updatePilotError: function()
  {
    function adiff(a, b)
    {
      // Handle the transition from Pi to -Pi (which are next to each other)
      if (a < -PId2 && b > PId2)
      {
        return (PIx2 + a) - b
      }
      else if (a > PId2 && b < -PId2)
      {
        return a - (PIx2 + b);
      }
      else
      {
        return a - b;
      }
    }

    // Calculate current rotational error - the difference between the actual rotation and the
    // desired rotation.
    this._adOrientationError.publish(
    {
      pitch: adiff(this.pitchTarget(), this.pitchActual()),
      roll: adiff(this.rollTarget(), this.rollActual()),
      heading: adiff(this.headingTarget(), this.headingActual())
    });
  },

  _shutdownPower: function()
  {
    // Disable motors when power *must* be shutdown
    this._mode = SHUTDOWN;
    for (var name in this._thrusters)
    {
      this.thrusterActual(name, 0);
    }
    for (var name in this._servos)
    {
      this.servoActual(name, null);
    }
  },
  
  //
  // Use to test a thruster.
  //
  _testThruster: function(thrusterName, on)
  {
    if (thrusterName in this._thrusters)
    {
      this.thrusterActual(thrusterName, on ? 0.50 : 0);
    }
  }

};

module.exports = pilot;
