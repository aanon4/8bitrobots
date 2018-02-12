'use strict';

console.info("Loading 108mm wheels.");

const genericWheel = require('./wheel-generic');

const settings =
{
  diameter: 108 // mm
};

function wheel(config)
{
  genericWheel.call(this, config, settings);
}

wheel.prototype = genericWheel.prototype;

module.exports = wheel;
