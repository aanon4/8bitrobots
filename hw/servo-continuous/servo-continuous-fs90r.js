console.info('Loading FS90R continuous servos.');

const CServo = require('./servo-continuous-generic');

const settings =
{
  kV:       21.6, // 130rpm @ 6v
  periodMs: 20.0,
  minV:      4.8,
  maxV:      6.0,
  maxRpm:  130.0,
  minPulse:  0.9,
  maxPulse:  2.1,
  deadBand:  0.01,
  size:
  {
    length: 23.2,
    height: 22.0,
    width:  12.6,
    weight:  9.0
  }
};

function servo(config)
{
  CServo.call(this, config, settings);
}

servo.prototype = CServo.prototype;

module.exports = servo;
