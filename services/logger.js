console.info('Loading Logger.');

const fs = require('fs');
const path = require('path');

const LOG_CONFIG =
{
  NAME: '/tmp/8bitrobot/log.txt',
  PERIOD: 5000, // Log every 5 seconds
  COUNT: 10 // with 10 log burst
};

try
{
  fs.mkdirSync(path.dirname(LOG_CONFIG.NAME));
}
catch (_)
{
}


const w = fs.createWriteStream(LOG_CONFIG.NAME);
function log(event)
{
  w.write(`${new Date().toISOString()} | ${JSON.stringify(event)}\n`);
}

const filters = {};
rosNode.init('/logger').subscribe({ topic: '*' }, (event) =>
{
  const topic = event.topic;
  // Always log debug info
  if (topic.indexOf('/debug/') === 0)
  {
    log(event)
  }
  else
  {
    // Restrict how often we log an event to every LOG_PERIOD ms.
    const now = Date.now();
    const filter = filters[topic] || (filters[topic] = { count: 0, start: now });
    const available = (now - filter.start) / LOG_CONFIG.PERIOD + LOG_CONFIG.COUNT - filter.count;
    if (available > 0)
    {
      if (available > LOG_CONFIG.COUNT)
      {
        filter.now = now;
      }
      filter.count++;
      log(event);
    }
  }
});
