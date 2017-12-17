console.info('Loading Hitec HS-5086WP digital servos.');

var genericServo = require('./servo-generic');

var settings =
{
  minAngle:        0.0,
  maxAngle:    Math.PI,
  minPulseMs:      1.0,
  maxPulseMs:      2.0,
  periodMs:       10.0,
  minV:            4.7,
  maxV:            6.0
};

function servo(config)
{
  genericServo.call(this, config, settings);
}

servo.prototype = genericServo.prototype;

module.exports = servo;
