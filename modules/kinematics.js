'use strict';

console.info('Loading Kinematics.');

const THREE = require('../modules/three');

const AUTOLEVEL_DELAY = 5000; // 5 seconds

const SERVICE_SETLEVEL = { service: 'set_level', schema: {} };
const SERVICE_SETWATER = { service: 'set_water_density', schema: { density: 'Number' } };
const SERVICE_SETAIR = { service: 'set_sea_level', schema: { seaLevel: 'Number' } };

const TOPIC_K_ANGULAR = { topic: 'angular', schema: { pitch: 'Number', roll: 'Number', heading: 'Number' } };
const TOPIC_K_ACCELERATION = { topic: 'acceleration', schema: { x: 'Number', y: 'Number', z: 'Number' } };
const TOPIC_K_CALIBRATION = { topic: 'calibration', schema: { calibrated: 'Boolean' } };
const TOPIC_K_POSITION = { topic: 'position', schema: { altitude: 'Number', latitude: 'Number', longitude: 'Number' } };

const TOPIC_ORIENTATION = { topic: 'orientation' };
const TOPIC_ACCELERATION = { topic: 'acceleration' };
const TOPIC_CALIBRATION = { topic: 'calibration' };
const TOPIC_PRESSURE = { topic: 'pressure' };


function kinematics(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._monitor = config.monitor;
  this._calibrations = {};
  this._orientations = {};
  this._accelerations = {};
  this._latitude = null;
  this._longitude = null;
  this._depth = 0;
  this._altitude = 0;
  this._calibrated = null;
  this._calibrationTimeout = config.calibrationTimeout || 0;
  this._waterDensity = Number.MAX_SAFE_INTEGER;
  this._seaLevel = 116690.4; // Pa
}

kinematics.prototype =
{
  enable: function()
  {
    this._adAngular = this._node.advertise(TOPIC_K_ANGULAR);
    this._adAcceleration = this._node.advertise(TOPIC_K_ACCELERATION);
    this._adCalibration = this._node.advertise(TOPIC_K_CALIBRATION);
    this._adPosition = this._node.advertise(TOPIC_K_POSITION);

    this._monitor.forEach((mon) =>
    {
      if ('headingOffset' in mon)
      {
        this._node.subscribe(this._topicName(mon.name, TOPIC_ORIENTATION), (event) =>
        {
          this._imuOrientation(mon, event);
        })
        this._node.subscribe(this._topicName(mon.name, TOPIC_ACCELERATION), (event) =>
        {
          this._imuAcceleration(mon, event);
        });
        this._node.subscribe(this._topicName(mon.name, TOPIC_CALIBRATION), (event) =>
        {
          this._imuCalibration(mon, event);
        });
      }
      else if ('seaLevel' in mon)
      {
        this._node.subscribe(this._topicName(mon.name, TOPIC_PRESSURE), (event) =>
        {
          this._airPressure(mon, event);
        });
      }
      else if ('waterDensity' in mon)
      {
        this._node.subscribe(this._topicName(mon.name, TOPIC_PRESSURE), (event) =>
        {
          this._waterPressure(mon, event);
        });
      }
    });

    this._node.service(SERVICE_SETLEVEL, (request) =>
    {
      this._setLevel();
    });
    this._node.service(SERVICE_SETWATER, (request) =>
    {
      this._setEnvironWater(request);
    });
    this._node.service(SERVICE_SETAIR, (request) =>
    {
      this._setEnvironAir(request);
    });

    return this;
  },
  
  disable: function()
  {
    this._monitor.forEach((mon) =>
    {
      if ('headingOffset' in mon)
      {
        this._node.unsubscribe(this._topicName(mon.name, TOPIC_ORIENTATION));
        this._node.unsubscribe(this._topicName(mon.name, TOPIC_ACCELERATION));
        this._node.unsubscribe(this._topicName(mon.name, TOPIC_CALIBRATION));
      }
      else if (('seaLevel' in mon) || ('waterDensity' in mon))
      {
        this._node.unsubscribe(this._topicName(mon.name, TOPIC_PRESSURE));
      }
    });

    this._node.unservice(SERVICE_SETLEVEL);
    this._node.unservice(SERVICE_SETWATER);
    this._node.unservice(SERVICE_SETAIR);

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

  _imuOrientation: function(imu, event)
  {
    // Update orientation from IMU
    let orientation = this._orientations[imu.name];
    if (!orientation)
    {
      orientation = { when: Date.now() + AUTOLEVEL_DELAY, levels: { pitch: 0, roll: 0, heading: imu.headingOffset } };
      this._orientations[imu.name] = orientation;
    }

    // Convert quaternion conjugate to euler
    let q = new THREE.Quaternion(event.x, event.y, event.z, event.w);
    let v = new THREE.Euler();
    v.setFromQuaternion(q);
    let euler =
    {
      pitch: v.x,
      roll: v.y,
      heading: v.z,
    };

    if (orientation.when !== 0 && orientation.when < Date.now())
    {
      // Auto-level
      orientation.when = 0;
      orientation.levels.pitch = euler.pitch;
      orientation.levels.roll = euler.roll;
    }
 
    const center = new THREE.Vector2();

    // Store the various axes rotations as vectors. This allows us to easily average
    // multiple rotations later.
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
  
  _imuAcceleration: function(imu, event)
  {
    if (event.confidence > 0)
    {
      // Update acceleration from IMU
      var acc = this._accelerations[imu.name] || (this._accelerations[imu.name] = {});
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
  
  _imuCalibration: function(imu, event)
  {
    var now = Date.now();
    var cal = this._calibrations[imu.name] || (this._calibrations[imu.name] = {});
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

  _airPressure: function(mon, event)
  {
    const seaLevelPa = mon.seaLevel || this._seaLevel;
    this._altitude = 44330.0 * (1.0 - Math.pow(event.Pa / seaLevelPa, 0.1903));
    this._adPosition.publish(
    {
      altitude: parseFloat(this._altitude.toFixed(2)), latitude: this._latitude, longitude: this._longitude
    });
  },
  
  _waterPressure: function(mon, event)
  {
    const waterDensity = mon.waterDensity || this._waterDensity;
    this._depth = (event.Pa - 101325.0) / (waterDensity * 9.80665);
    this._adPosition.publish(
    {
      depth: parseFloat(this._depth.toFixed(2)), latitude: this._latitude, longitude: this._longitude
    });
  },
  
  _setEnvironWater: function(request)
  {
    this._waterDensity = request.density;
  },

  _setEnvironAir: function(request)
  {
    this._seaLevel = request.seaLevel;
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
