#! /usr/bin/env node

'use strict';

console.info = function(){};
const ROS_SLAVE = require('../modules/ros-slave');
const ROS = require('../modules/ros');

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

const NODE = new ROS_SLAVE({ name: '/ros-monitor', target: `ws://${target}:8080/ros` }).enable()._node;

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

