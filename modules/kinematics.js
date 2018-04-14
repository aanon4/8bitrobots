'use strict';

console.info('Loading Kinematics.');

const THREE = require('three');
const ConfigManager = require('modules/config-manager');

const AUTOLEVEL_DELAY = 5000; // 5 seconds

const SERVICE_RESETLEVEL = { service: 'reset_level', schema: {} };

const TOPIC_K_ORIENTATION = { topic: 'orientation', schema: { x: 'Number', y: 'Number', z: 'Number', w: 'Number' } };
const TOPIC_K_ACCELERATION = { topic: 'acceleration', schema: { x: 'Number', y: 'Number', z: 'Number' } };
const TOPIC_K_CALIBRATION = { topic: 'calibration', schema: { calibrated: 'Boolean' } };
const TOPIC_K_POSITION = { topic: 'position', schema: { altitude: 'Number', depth: 'Number', latitude: 'Number', longitude: 'Number' } };

const TOPIC_ORIENTATION = { topic: 'orientation' };
const TOPIC_ACCELERATION = { topic: 'acceleration' };
const TOPIC_CALIBRATION = { topic: 'calibration' };
const TOPIC_PRESSURE = { topic: 'pressure' };


function kinematics(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._config = new ConfigManager(this,
  {
    seaLevelPressure: config.seaLevelPressure || 101771, // Pa
    waterDensity: config.waterDensity || 1000.0, // kg/m^3
    headingOffset: config.headingOffset || 0
  });

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
  this._config.enable();
}

kinematics.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this.reconfigure();

      this._adAngular = this._node.advertise(TOPIC_K_ORIENTATION);
      this._adAcceleration = this._node.advertise(TOPIC_K_ACCELERATION);
      this._adCalibration = this._node.advertise(TOPIC_K_CALIBRATION);
      this._adPosition = this._node.advertise(TOPIC_K_POSITION);

      this._calibrations = {};
      this._orientations = {};
      this._accelerations = {};

      this._monitor.forEach((mon) =>
      {
        switch (mon.type)
        {
          case 'imu':
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
            break;
          case 'air':
            this._node.subscribe(this._topicName(mon.name, TOPIC_PRESSURE), (event) =>
            {
              this._airPressure(mon, event);
            });
            break;
          case 'water':
            this._node.subscribe(this._topicName(mon.name, TOPIC_PRESSURE), (event) =>
            {
              this._waterPressure(mon, event);
            });
            break;
          default:
            break;
        }
      });

      this._node.service(SERVICE_RESETLEVEL, (request) =>
      {
        this._resetLevel();
      });
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._monitor.forEach((mon) =>
      {
        switch (mon.type)
        {
          case 'imu':
            this._node.unsubscribe(this._topicName(mon.name, TOPIC_ORIENTATION));
            this._node.unsubscribe(this._topicName(mon.name, TOPIC_ACCELERATION));
            this._node.unsubscribe(this._topicName(mon.name, TOPIC_CALIBRATION));
            break;
          case 'air':
          case 'water':
            this._node.unsubscribe(this._topicName(mon.name, TOPIC_PRESSURE));
            break;
        }
      });

      this._node.unservice(SERVICE_RESETLEVEL);

      this._node.unadvertise(TOPIC_K_ORIENTATION);
      this._node.unadvertise(TOPIC_K_ACCELERATION);
      this._node.unadvertise(TOPIC_K_CALIBRATION);
      this._node.unadvertise(TOPIC_K_POSITION);
    }
    return this;
  },

  reconfigure: function()
  {
    this._waterDensity = this._config.get('waterDensity');
    this._seaLevel = this._config.get('seaLevelPressure');
    this._headingOffset = this._config.get('headingOffset');
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
      orientation = {
        when: Date.now() + AUTOLEVEL_DELAY,
        levels:
        {
          x: 0,
          y: 0,
          z: this._headingOffset
        },
        confidence: 0,
        x: new THREE.Vector2(),
        y: new THREE.Vector2(),
        z: new THREE.Vector2()
      };
      this._orientations[imu.name] = orientation;
    }

    // Convert quaternion conjugate to euler
    const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(event.x, event.y, event.z, event.w));

    if (orientation.when !== 0 && orientation.when < Date.now())
    {
      // Auto-level
      orientation.when = 0;
      orientation.levels.x = euler.x;
      orientation.levels.y = euler.y;
    }
 
    const center = new THREE.Vector2();

    // Store the various axes rotations as vectors. This allows us to easily average
    // multiple rotations later.
    orientation.confidence = event.confidence;
    orientation.x = new THREE.Vector2(1, 0).rotateAround(center, euler.x - orientation.levels.x);
    orientation.y = new THREE.Vector2(1, 0).rotateAround(center, euler.y - orientation.levels.y);
    orientation.z = new THREE.Vector2(1, 0).rotateAround(center, euler.z - orientation.levels.z);

    // Generate current stablization information based on filtered IMU data
    let data = this._getUnadjustedAngular();
    if (data)
    {
      this._adAngular.publish(
      {
        x: data.x,
        y: data.y,
        z: data.z,
        w: data.w
      });
    }
  },
  
  _getUnadjustedAngular: function()
  {
    // Generate current stablization information based on filtered IMU data
    var count = 0;
    var x = new THREE.Vector2();
    var y = new THREE.Vector2();
    var z = new THREE.Vector2();
    for (var name in this._orientations)
    {
      var orientation = this._orientations[name];
      if (orientation.confidence > 0)
      {
        count++;
        x.addScaledVector(orientation.x, orientation.confidence);
        y.addScaledVector(orientation.y, orientation.confidence);
        z.addScaledVector(orientation.z, orientation.confidence);
      }
    }
    if (count)
    {
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(
        x.normalize().angle(),
        y.normalize().angle(),
        z.normalize().angle()
      ));
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
    this._altitude = 44330.0 * (1.0 - Math.pow(event.Pa / this._seaLevel, 0.1903));
    this._adPosition.publish(
    {
      altitude: parseFloat(this._altitude.toFixed(2)), latitude: this._latitude, longitude: this._longitude
    });
  },
  
  _waterPressure: function(mon, event)
  {
    this._depth = (event.Pa - this._seaLevel) / (this._waterDensity * 9.80665);
    this._adPosition.publish(
    {
      depth: parseFloat(this._depth.toFixed(2)), latitude: this._latitude, longitude: this._longitude
    });
  },

  _resetLevel: function()
  {
    function limit(angle)
    {
      return angle <= Math.PI ? angle : angle - 2 * Math.PI;
    }
    for (var target in this._calibrations)
    {
      var orientation = this._orientations[target];
      orientation.levels.x = limit(orientation.levels.x + orientation.x.angle());
      orientation.levels.y = limit(orientation.levels.y + orientation.y.angle());
    }
  }
};

module.exports = kinematics;
