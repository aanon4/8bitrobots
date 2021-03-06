console.info('Loading Hitec HS-35HD analog servos.');

var genericServo = require('./servo-generic');

var settings =
{
  minAngle:        0.0,
  maxAngle:    Math.PI,
  minPulseMs:      0.5,
  maxPulseMs:      2.5,
  periodMs:       20.0,
  minV:            4.8,
  maxV:            6.0
};

function servo(config)
{
  genericServo.call(this, config, settings);
}

servo.prototype = genericServo.prototype;

module.exports = servo;
