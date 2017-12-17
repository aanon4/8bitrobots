console.info('Loading HobbyKing Brushless XC-10A ESCs.');

var genericEsc = require('./esc-generic');

var settings =
{
  minPulseMs:  1.0,
  maxPulseMs:  2.0,
  periodMs:   20.0,
  efficiency:
  {
    forward: 1,
    backward: 1
  },
  neutralPulseMs: 1.5,
  neutralLowMs:   1.463,
  neutralHighMs:  1.538,
};

function esc(config)
{
  genericEsc.call(this, config, settings);
}

esc.prototype = genericEsc.prototype;

module.exports = esc;
