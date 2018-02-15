console.info('Loading FT90R continuous digital servos.');

const CServo = require('./servo-continuous-generic');

const settings =
{
  kV:       28.0, // 170rpm @ 6v
  periodMs: 20.0,
  minV:      4.8,
  maxV:      6.0,
  maxRpm:    170.0,
  bands:
  {
    cw:  [ 1.480, 1.200 ],
    n:   [ 1.480, 1.520 ],
    ccw: [ 1.520, 1.800 ]
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
