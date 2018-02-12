#! /usr/bin/env node

'use strict';

console.info = function(){};
const API_SLAVE = require('../modules/8bit-slave');
require('../modules/8bit');

let target = 'localhost';
const argv = process.argv.slice(2);
const tidx = argv.indexOf('--target');
if (tidx !== -1)
{
  target = argv[tidx + 1];
  argv.splice(tidx, 2);
}
let timestamp = false;
const sidx = argv.indexOf('--timestamp');
if (sidx !== -1)
{
  timestamp = true;
  argv.splice(sidx, 1);
}

if (argv.length === 0)
{
  console.log('Usage: 8bit-monitor [--target hostname] [--timestamp] topic ....');
  process.exit(1);
}
let all = (argv.length === 1 && argv[0] === 'ALL');

const NODE = new API_SLAVE({ name: '/8bit-monitor', target: target }).enable()._node;

function logTopic(topic, msg)
{
  console.log(`${timestamp ? Date.now() + ': ' : ''}${argv.length > 1 || all ? (topic + ': ') : ''}${JSON.stringify(msg)}`);
}

if (all)
{
  const LIST = NODE.proxy({ service: '/list' });
  LIST({}).then((list) => {
    NODE.unproxy({ service: '/list' });
    list.topics.forEach((topic) => {
      NODE.subscribe({ topic: topic }, (msg) => {
        logTopic(topic, msg);
      });
    });
  });
}
else
{
  argv.forEach((topic) => {
    NODE.subscribe({ topic: topic }, (msg) => {
      logTopic(topic, msg);
    });
  });
}
