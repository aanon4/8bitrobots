'use strict';

console.info("Loading TT01 drive shaft gear reduction.");

const genericGear = require('./gear-reduction-generic');

const settings =
{
  drive: 61.0,
  motor: 21.0,
  scale: 61.0 / 21.0
};

function gear(config)
{
  genericGear.call(this, config, settings);
}

gear.prototype = genericGear.prototype;

module.exports = gear;
