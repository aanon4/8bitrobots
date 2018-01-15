console.info('Loading Hitec HS-5646WP digital servos.');

var genericServo = require('./servo-generic');

var settings =
{
  minAngle:        0.0,
  maxAngle:    Math.PI,
  minPulseMs:      1.0,
  maxPulseMs:      2.0,
  periodMs:       20.0,
  minV:            6.0,
  maxV:            7.4
};

function servo(config)
{
  genericServo.call(this, config, settings);
}

servo.prototype = genericServo.prototype;

module.exports = servo;
