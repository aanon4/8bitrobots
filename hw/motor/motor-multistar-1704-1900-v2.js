console.info("Loading Turnigy Multistar 1704-1900Kv V2 brushless motors.");

var genericMotor = require('./motor-generic-brushless');

var settings =
{
  kV: 1900,
  volts: 11.1,
  watts: 49,
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
