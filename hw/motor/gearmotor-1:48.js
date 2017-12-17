console.info("Loading Generic Plastic 1:48 gearmotors.");

var genericMotor = require('./gearmotor-generic');

var settings =
{
  profiles:
  [
    { volts: 3, ratio: 1/48, torque: '800gf cm min' },
    { volts: 12, ratio: 1/48 }
  ],
  efficiency:
  {
    forward: 1,
    backward: 1
  },
  periodMs: 40.0
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
