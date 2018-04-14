console.info('Loading Cameras.');

const Service = require('../../modules/services');
const Lights = require('./lights');
const Gimbal = require('../gimbal');

const TOPIC_CONTROL = { topic: 'set_control' };


function camera(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._calibration = config.calibration;
  (config.servos || []).forEach(function(servo)
  {
    switch (servo._name)
    {
      case '/camera/tilt/manager':
        this._tilt = servo;
        break;
      case '/camera/pan/manager':
        this._pan = servo;
        break;
      default:
        break;
    }
  }, this);
  this._video = Service.load(
    () =>
    {
      const Video = require('./video.' + config.video.type);
      return new Video(
      {
        name: this._name + '/video',
        left: config.video.left,
        right: config.video.right,
        flip: config.video.flip
      });
    }
  );

  if (config.lights)
  {
    this._lights = Service.load(
      () =>
      {
        return new Lights(
        {
          name: this._name + '/lights',
          pwm: config.lights
        });
      }
    );
  }

  this._gimbal = Service.load(
    () =>
    {
      return new Gimbal(
      {
        name: this._name + '/gimbal',
        tilt: (angle) =>
        {
          this.setTilt(angle);
        },
        pan: (angle) =>
        {
          this.setPan(angle);
        }
      });
    }
  );
}

camera.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      if (this._tilt)
      {
        this._tilt.enable();
        this.setTilt(0, 0);
      }
      if (this._pan)
      {
        this._pan.enable();
        this.setPan(0, 0);
      }
      if (this._lights)
      {
        this._lights.setOn(0);
      }

      this._node.subscribe(TOPIC_CONTROL, (event) =>
      {
        this._handleActionEvents(event);
      });
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._node.unsubscribe(TOPIC_CONTROL);
      if (this._tilt)
      {
        this._tilt.disable();
      }
      if (this._pan)
      {
        this._pan.disable();
      }
    }
  },
  
  httpVideo: function(response, nr)
  {
    return this._video.httpVideo(response, nr);
  },
  
  setPan: function(angle)
  {
    if (this._pan)
    {
      if (angle < this._calibration.pan.minAngle)
      {
        angle = this._calibration.pan.minAngle;
      }
      else if (angle > this._calibration.pan.maxAngle)
      {
        angle = this._calibration.pan.maxAngle;
      }
      var diff = Math.abs(angle - this.getPan());
      this._pan.setAngle(angle * this._calibration.pan.adjustScale + this._calibration.pan.adjustAngle, diff < 5 ? 0 : diff * 5);
    }
  },
  
  getPan: function()
  {
    return this._pan ? ((this._pan.getCurrentAngle() - this._calibration.pan.adjustAngle) / this._calibration.pan.adjustScale) | 0 : 0;
  },
  
  panLeft: function()
  {
    this._gimbal.setPan(this._calibration.pan.minAngle);
  },
  
  panRight: function()
  {
    this._gimbal.setPan(this._calibration.pan.maxAngle);
  },
  
  setTilt: function(angle)
  {
    if (this._tilt)
    {
      if (angle < this._calibration.tilt.minAngle)
      {
        angle = this._calibration.tilt.minAngle;
      }
      else if (angle > this._calibration.tilt.maxAngle)
      {
        angle = this._calibration.tilt.maxAngle;
      }
      let diff = Math.abs(angle - this.getTilt());
      this._tilt.setAngle(angle * this._calibration.tilt.adjustScale + this._calibration.tilt.adjustAngle, diff < 5 ? 0 : diff * 5);
    }
  },
  
  getTilt: function()
  {
    return this._tilt ? ((this._tilt.getCurrentAngle() - this._calibration.tilt.adjustAngle) / this._calibration.tilt.adjustScale) | 0 : 0;
  },
  
  tiltUp: function()
  {
    this._gimbal.setTilt(this._calibration.tilt.maxAngle);
  },
  
  tiltDown: function()
  {
    this._gimbal.setTilt(this._calibration.tilt.minAngle);
  },
  
  _handleActionEvents: function(event)
  {
    switch (event.action)
    {
      case 'home':
        this.setPan(0, 500);
        this.setTilt(0, 500);
        break;
   
      case 'tilt':
        switch (event.direction)
        {
          case 'up':
            this.tiltUp();
            break;
          case 'down':
            this.tiltDown();
            break;
          case 'stop':
            this.setTilt(this.getTilt(), 0);
            break;
          default:
            break;
        }
        break;
       
      case 'pan':
        switch (event.direction)
        {
          case 'left':
            this.panLeft();
            break;
          case 'right':
            this.panRight();
            break;
          case 'stop':
            this.setPan(this.getPan(), 0);
            break;
          default:
            break;
        }
        break;

      default:
        break;
    }
  }
};

module.exports = camera;
