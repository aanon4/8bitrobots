console.info("Loading NTM 20-30S/800kV brushless motors.");

const genericMotor = require('./motor-generic-brushless');

const settings =
{
  kV: 800,
  volts: 10,
  watts: 100,
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
