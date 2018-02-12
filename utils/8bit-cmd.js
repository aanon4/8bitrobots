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

if (argv.length !== 2)
{
  console.log('Usage: 8bit-cmd [--target hostname] service argument');
  process.exit(1);
}

const NODE = new API_SLAVE({ name: '/8bit-cmd', target: target }).enable()._node;

const CMD = NODE.proxy({ service: `${argv[0]}` });
CMD(JSON.parse(argv[1])).then((result) => {
  delete result.id;
  delete result.timestamp;
  delete result.__remote;
  console.log(result);
  process.exit(0);
});
