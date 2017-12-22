console.info("Loading 2122/13T brushless motors.");

const genericMotor = require('./motor-generic-brushless');

const settings =
{
  kV: 1000,
  volts: 12,
  watts: 100,
  amps: 12,
  poles: 14,
  resistance: 0,
  maxRpm: 12000,
  size:
  {
    diameter: 30,
    length: 27.5,
    weight: 47
  },
  shaft:
  {
    diameter: 3.17,
    length: 12
  }
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
