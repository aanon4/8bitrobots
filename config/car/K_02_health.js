module.exports = function()
{
  const Health = require('services/health');
  return new Health(
  {
    name: '/health/monitor',
    metrics:
    [
      { topic: '/car/drive/vesc/voltage', key: 'v', low: 10, high: 100, chemistry: 'LiPo', cells: 4 }
    ]
  });
}
