console.info("Loading TenShock 1/10 Scale RC906 1750kV brushless motors.");

const genericMotor = require('./motor-generic-brushless');

const settings =
{
  kV: 1750,
  volts: 23,
  watts: 1500,
  amps: 65,
  poles: 6,
  resistance: 11.7,
  maxRpm: 40250,
  size:
  {
    diameter: 36,
    length: 50,
    weight: 166
  },
  shaft:
  {
    diameter: 3.175,
    length: 16
  },
  url: 'http://www.tenshock.com/products/rc-model-car-power-system-brushless-motor/1-10-car-brushless-motor/rc-906-6-pole-motor.html'
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
