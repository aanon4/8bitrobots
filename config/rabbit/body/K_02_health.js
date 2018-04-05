module.exports = function()
{
  const Health = require('modules/health');
  return new Health(
  {
    name: '/health/node',
    battery:
    {
      topic: '/battery/status',
      chemistry: 'LiPo',
      cells: 2
    }
  });
}
