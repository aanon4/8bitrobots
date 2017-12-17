console.info('Loading Afro Opto 12A ESCs.');

const genericEsc = require('./esc-generic');

const settings =
{
  //neutralLowMs:   1.460,
  //neutralHighMs:  1.540,
  //neutralPulseMs: 1.5,
  minPulseMs:     1.0,
  maxPulseMs:     2.0,
  periodMs:       20,
  efficiency:
  {
    forward: 1,
    backward: 1
  }
};

function esc(config)
{
  genericEsc.call(this, config, settings);
}

esc.prototype = genericEsc.prototype;

module.exports = esc;
