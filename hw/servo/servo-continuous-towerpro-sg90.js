console.info('Loading TowerPro SG90 analog servos (continuous).');

const genericServo = require('./servo-continuous-generic');

const settings =
{
  stopPulseMs:          0.0,
  forwardPulseMs:       2.4,
  backwardPulseMs:      0.5, 
  periodMs:             5.0,
  minV:                 4.0,
  maxV:                 7.2
};

function servo(config)
{
  genericServo.call(this, config, settings);
}

servo.prototype = genericServo.prototype;

module.exports = servo;
