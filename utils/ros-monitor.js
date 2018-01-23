#! /usr/bin/env node

'use strict';

const ROS_SLAVE = require('../services/slave');
const ROS = require('../services/ros');

let target = 'localhost';
const argv = process.argv.slice(2);
const tidx = argv.indexOf('--target');
if (tidx !== -1)
{
  target = argv[tidx + 1];
  argv.splice(tidx, 2);
}

if (argv.length === 0)
{
  console.log('Usage: ros-monitor [--target hostname] topic ....');
  process.exit(1);
}

const SLAVE = new ROS_SLAVE({ target: `ws://${target}:8080/socket` }).enable();
const NODE = SLAVE._node;

function logTopic(e)
{
  const event = Object.assign({}, e);
  delete event.__remote;
  delete event.timestamp;
  console.log(JSON.stringify(event));
}

argv.forEach((topic) => {
  NODE.subscribe({ topic: topic }, (e) => {
    logTopic(e);
  });
});

