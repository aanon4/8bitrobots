console.info('Loading FS90R continuous servos.');

const CServo = require('./servo-continuous-generic');

const settings =
{
  kV:       22.0, // 110rpm @ 5v
  periodMs: 20.0,
  minV:      4.8,
  maxV:      6.0,
  maxRpm:    130.0,
  bands:
  {
    cw:  [ 1.470, 1.200 ],
    n:   [ 1.470, 1.530 ],
    ccw: [ 1.530, 1.800 ]
  },
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
