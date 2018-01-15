console.info('Loading TowerPro SG90 analog servos.');

var genericServo = require('./servo-generic');

var settings =
{
  minAngle:        0.0,
  maxAngle:    Math.PI,
  minPulseMs:      0.5,
  maxPulseMs:      2.4,
  periodMs:       20.0,
  minV:            4.0,
  maxV:            7.2
};

function servo(config)
{
  genericServo.call(this, config, settings);
}

servo.prototype = genericServo.prototype;

module.exports = servo;
