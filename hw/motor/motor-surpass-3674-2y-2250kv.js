console.info("Loading Surpass 1/10 Scale 3674 2250kV brushless motors.");

const genericMotor = require('./motor-generic-brushless');

const settings =
{
  kV: 2250,
  volts: 22.2,
  watts: 1800,
  amps: 80,
  poles: 4,
  resistance: 0.0076,
  maxRpm: 50000,
  size:
  {
    diameter: 36,
    length: 74,
    weight: 305
  },
  shaft:
  {
    diameter: 5,
    length: 17
  }
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
