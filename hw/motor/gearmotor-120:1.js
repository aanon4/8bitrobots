console.info("Loading Generic Plastic 120:1 gearmotors.");

const genericMotor = require('./gearmotor-generic');

const settings =
{
  periodMs: 40.0,
  kV: 26 // 120rpm @ 4.5v
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
