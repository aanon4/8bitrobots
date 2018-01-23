console.info('Loading Telemetry.');

const fs = require('fs');
const path = require('path');

const LOG_CONFIG =
{
  NAME: '/tmp/8bitrobot/telemetry.json',
};

try
{
  fs.mkdirSync(path.dirname(LOG_CONFIG.NAME));
}
catch (_)
{
}

const w = fs.createWriteStream(LOG_CONFIG.NAME, { autoClose: false });
const node = rosNode.init('/telemetry/node');
node.proxy({ service: '/list' })().then((lists) => {
  lists.topics.forEach((topic) => {
    node.subscribe({ topic: topic }, (event) => {
      w.write(`${JSON.stringify(event)}\n`);
    });
  });
});
