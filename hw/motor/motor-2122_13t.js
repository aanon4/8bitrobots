console.info("Loading 2122/13T brushless motors.");

const genericMotor = require('./motor-generic-brushless');

const settings =
{
  kV: 1000,
  volts: 10,
  watts: 100
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
