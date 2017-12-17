console.info("Loading NTM 20-30S/800kV brushless motors.");

var genericMotor = require('./motor-generic-brushless');

var settings =
{
  kV: 800,
  volts: 10,
  watts: 100,
  efficiency:
  {
    forward: 1,
    backward: 1
  }
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
