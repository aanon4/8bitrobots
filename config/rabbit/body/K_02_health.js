module.exports = function()
{
  const Health = require('modules/health');
  return new Health(
  {
    name: '/health/node',
    battery:
    {
      topic: '/battery/status',
      batteryChemistry: 'LiPo',
      cells: 2
    }
  });
}
