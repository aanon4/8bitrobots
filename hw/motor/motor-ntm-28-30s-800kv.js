console.info("Loading NTM 20-30S/800kV brushless motors.");

const genericMotor = require('./motor-generic-brushless');

const settings =
{
  kV: 800,
  maxV: 18,
  watts: 300,
  amps: 20,
  poles: 0,
  resistance: 0,
  maxRpm: 14400,
  size:
  {
    diameter: 28,
    length: 30,
    weight: 65
  },
  shaft:
  {
    diameter: 3,
    length: 5
  },
  url: 'https://hobbyking.com/en_us/ntm-prop-drive-28-30s-800kv-300w-brushless-motor-short-shaft-version.html'
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
