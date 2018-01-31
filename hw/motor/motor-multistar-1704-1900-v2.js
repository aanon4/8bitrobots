console.info("Loading Turnigy Multistar 1704-1900Kv V2 brushless motors.");

const genericMotor = require('./motor-generic-brushless');

const settings =
{
  kV: 1900,
  maxV: 11.1,
  watts: 49
};

function motor(config)
{
  genericMotor.call(this, config, settings);
}

motor.prototype = genericMotor.prototype;

module.exports = motor;
