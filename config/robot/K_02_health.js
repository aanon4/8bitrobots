module.exports = function()
{
  const Health = require('modules/health');
  return new Health(
  {
    name: '/health/node',
    metrics:
    [
      { topic: '/battery/status', key: 'v', low: 10, high: 100, chemistry: 'LiPo', cells: 2 }
    ]
  });
}
