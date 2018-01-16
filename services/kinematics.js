console.info('Loading Kinematics.');

const THREE = require('../services/three');

const AUTOLEVEL_DELAY = 10;

const TOPIC_SETLEVEL = { topic: 'set_level' };

const TOPIC_K_ANGULAR = { topic: 'angular' };
const TOPIC_K_ACCELERATION = { topic: 'acceleration' };
const TOPIC_K_CALIBRATION = { topic: 'calibration' };
const TOPIC_K_POSITION = { topic: 'position' };

const TOPIC_ORIENTATION = { topic: 'orientation' };
const TOPIC_ACCELERATION = { topic: 'acceleration' };
const TOPIC_CALIBRATION = { topic: 'calibration' };

const TOPIC_PRESSURE = { topic: '/environment/external/pressure' };
const TOPIC_WATER = { topic: '/environment/water_density' };


function kinematics(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  var sname = this._name.split('.');
  this._monitor = config.monitor;
  this._calibrations = {};
  this._orientations = {};
  this._accelerations = {};
  this._depth = 0;
  this._calibrated = null;
  this._calibrationTimeout = config.calibrationTimeout || 0;
  this._waterDensity = Number.MAX_SAFE_INTEGER;
}

kinematics.prototype =
{
  enable: function()
  {
    this._adAngular = this._node.advertise(TOPIC_K_ANGULAR);
    this._adAcceleration = this._node.advertise(TOPIC_K_ACCELERATION);
    this._adCalibration = this._node.advertise(TOPIC_K_CALIBRATION);
    this._adPosition = this._node.advertise(TOPIC_K_POSITION);

    this._monitor.forEach((prefix) =>
    {
      this._node.subscribe(this._topicName(prefix, TOPIC_ORIENTATION), (event) =>
      {
        this._imuOrientation(event);
      })
      this._node.subscribe(this._topicName(prefix, TOPIC_ACCELERATION), (event) =>
      {
        this._imuAcceleration(event);
      });
      this._node.subscribe(this._topicName(prefix, TOPIC_CALIBRATION), (event) =>
      {
        this._imuCalibration(event);
      });
    });

    this._node.subscribe(TOPIC_SETLEVEL, (event) =>
    {
      this._setLevel();
    });
    this._node.subscribe(TOPIC_PRESSURE, (event) =>
    {
      this._environPressure(event);
    });
    this._node.subscribe(TOPIC_WATER, (event) =>
    {
      this._environWater(event);
    });

    return this;
  },
  
  disable: function()
  {
    this._monitor.forEach((prefix) =>
    {
      this._node.unsubscribe(this._topicName(prefix, TOPIC_ORIENTATION));
      this._node.unsubscribe(this._topicName(prefix, TOPIC_ACCELERATION));
      this._node.unsubscribe(this._topicName(prefix, TOPIC_CALIBRATION));
    });

    this._node.unsubscribe(TOPIC_SETLEVEL);
    this._node.unsubscribe(TOPIC_PRESSURE);
    this._node.unsubscribe(TOPIC_WATER);

    this._node.unadvertise(TOPIC_K_ANGULAR);
    this._node.unadvertise(TOPIC_K_ACCELERATION);
    this._node.unadvertise(TOPIC_K_CALIBRATION);
    this._node.unadvertise(TOPIC_K_POSITION);

    return this;
  },

  _topicName: function(prefix, topic)
  {
    let ntopic = Object.assign({}, topic);
    ntopic.topic = prefix + '/' + ntopic.topic;
    return ntopic;
  },

  _imuOrientation: function(event)
  {
    // Update orientation from IMU
    var orientation = this._orientations[event.name];
    if (!orientation)
    {
      orientation = { count: 0, levels: { pitch: 0, roll: 0, heading: 0 } };
      this._orientations[event.name] = orientation;
    }

    // Convert quaternion conjugate to euler
    let q = new THREE.Quaternion(event.x, event.y, event.z, event.w);
    let v = new THREE.Object3D();
    v.setRotationFromQuaternion(q);
    let euler =
    {
      pitch: -v.rotation.x,
      roll: -v.rotation.y,
      heading: v.rotation.z,
    };

    if (orientation.count++ === AUTOLEVEL_DELAY)
    {
      // Auto-level
      orientation.levels.pitch = euler.pitch;
      orientation.levels.roll = euler.roll;
    }
 
    const center = new THREE.Vector2();

    orientation.confidence = event.confidence;
    orientation.pitch = new THREE.Vector2(1, 0).rotateAround(center, euler.pitch - orientation.levels.pitch);
    orientation.roll = new THREE.Vector2(1, 0).rotateAround(center, euler.roll - orientation.levels.roll);
    orientation.heading = new THREE.Vector2(1, 0).rotateAround(center, euler.heading - orientation.levels.heading);

    // Generate current stablization information based on filtered IMU data
    var data = this._getUnadjustedAngular();
    if (data)
    {
      this._adAngular.publish(
      {
        pitch: data.pitch,
        roll: data.roll,
        heading: data.heading
      });
    }
  },
  
  _getUnadjustedAngular: function()
  {
    // Generate current stablization information based on filtered IMU data
    var count = 0;
    var pitch = new THREE.Vector2();
    var roll = new THREE.Vector2();
    var heading = new THREE.Vector2();
    for (var name in this._orientations)
    {
      var orientation = this._orientations[name];
      if (orientation.confidence > 0)
      {
        count++;
        pitch.addScaledVector(orientation.pitch, orientation.confidence);
        roll.addScaledVector(orientation.roll, orientation.confidence);
        heading.addScaledVector(orientation.heading, orientation.confidence);
      }
    }
    if (count)
    {
      function limit(angle)
      {
        return angle <= Math.PI ? angle : angle - 2 * Math.PI;
      }
      return { 
        pitch: limit(pitch.normalize().angle()),
        roll: limit(roll.normalize().angle()),
        heading: limit(heading.normalize().angle())
      };
    }
    else
    {
      return null;
    }
  },
  
  _imuAcceleration: function(event)
  {
    if (this._monitor.indexOf(event.name) === -1)
    {
      return;
    }

    if (event.confidence > 0)
    {
      // Update acceleration from IMU
      var acc = this._accelerations[event.name] || (this._accelerations[event.name] = {});
      acc.x = event.linearaccel.x;
      acc.y = event.linearaccel.y;
      acc.z = event.linearaccel.z;

      // Generate current acceleration information based on filtered IMU data
      var count = 0;
      var x = 0;
      var y = 0;
      var z = 0;
      for (var name in this._accelerations)
      {
        count++;
        acc = this._accelerations[name];
        x += acc.x;
        y += acc.y;
        z += acc.z;
      }
      if (count)
      {
        this._adAcceleration.publish(
        {
          x: x / count, y: y / count, z: z / count
        });
      }
    }
  },
  
  _imuCalibration: function(event)
  {
    if (this._monitor.indexOf(event.name) === -1)
    {
      return;
    }

    var now = Date.now();
    var cal = this._calibrations[event.name] || (this._calibrations[event.name] = {});
    cal.condidence = event.confidence;
    if (event.confidence > 0)
    {
      cal.lastValid = now;
    }
    else
    {
      cal.lastInvalid = now;
    }
    
    // System is calibrated as long as one sensor is calibrated within the time window
    var calibrated = false;
    for (var name in this._calibrations)
    {
      if (this._calibrations[name].confidence > 0 || this._calibrations[name].lastValid + this._calibrationTimeout > now)
      {
        calibrated = true;
        break;
      }
    }
    if (calibrated !== this._calibrated)
    {
      this._calibrated = calibrated;
      this._adCalibration.publish(
      {
        calibrated: calibrated
      });
    }
  },
  
  _environPressure: function(event)
  {
    this._depth = (event.Pa - 101325) / (this._waterDensity * 9.80665);
    this._adPosition.publish(
    {
      depth: parseFloat(this._depth.toFixed(2)), latitude: undefined, longitude: undefined
    });
  },
  
  _environWater: function(event)
  {
    this._waterDensity = event.density;
  },

  _setLevel: function()
  {
    function limit(angle)
    {
      return angle <= Math.PI ? angle : angle - 2 * Math.PI;
    }
    for (var target in this._calibrations)
    {
      var orientation = this._orientations[target];
      orientation.levels.pitch = limit(orientation.levels.pitch + orientation.pitch.angle());
      orientation.levels.roll = limit(orientation.levels.roll + orientation.roll.angle());
    }
  }
};

module.exports = kinematics;
