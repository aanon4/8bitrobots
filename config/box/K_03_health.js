module.exports = function()
{
  const Health = require('modules/health');
  return new Health(
  {
    name: '/health/node',
    battery:
    {
      topic: '/power/status', 
      chemistry: 'LiPo', 
      cells: 2,
      minV: 6.5
    }
  });
}
