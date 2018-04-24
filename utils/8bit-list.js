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
const sidx = argv.indexOf('--schema');
if (sidx !== -1)
{
  argv.splice(sidx, 2);
}

if (argv.length !== 0)
{
  console.log('Usage: 8bit-list [--target hostname] [--schema]');
  process.exit(1);
}

const NODE = new API_SLAVE({ name: '/8bit-list', target: target }).enable()._node;

const LIST = NODE.proxy({ service: '/list' });
LIST({}).then((list) => {
  console.log('Topics:');
  list.topics.forEach((topic) => {
    console.log(`  ${topic.name}${topic.friendlyName ? ' [' + topic.friendlyName + ']' : ''}${sidx === -1 ? '' : ': ' + JSON.stringify(topic.schema)}`);
  });
  console.log('Services:');
  list.services.forEach((service) => {
    console.log(`  ${service.name}${service.friendlyName ? ' [' + service.friendlyName + ']' : ''}${sidx === -1 ? '' : ': ' + JSON.stringify(service.schema)}`);
  });
  NODE.unproxy({ service: '/list' });
  process.exit(0);
});
