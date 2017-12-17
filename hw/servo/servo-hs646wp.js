console.info('Loading Hitec HS-646WP analog servos.');

var genericServo = require('./servo-generic');

var settings =
{
  minAngle:        0.0,
  maxAngle:    Math.PI,
  minPulseMs:      0.4,
  maxPulseMs:      2.6,
  periodMs:       10.0,
  minV:            6.0,
  maxV:            7.4
};

function servo(config)
{
  genericServo.call(this, config, settings);
}

servo.prototype = genericServo.prototype;

module.exports = servo;
