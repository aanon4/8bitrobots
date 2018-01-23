module.exports = function()
{
  const Health = require('modules/health');
  return new Health(
  {
    name: '/health/node',
    metrics:
    [
      { topic: '/car/drive/vesc/voltage', key: 'v', low: 10, high: 100, chemistry: 'LiPo', cells: 3 }
    ]
  });
}
