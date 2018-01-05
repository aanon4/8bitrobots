'use strict';

console.info("Loading 63mm wheels.");

const genericWheel = require('./wheel-generic');

const settings =
{
  diameter: 63 // mm
};

function wheel(config)
{
  genericWheel.call(this, config, settings);
}

wheel.prototype = genericWheel.prototype;

module.exports = wheel;
