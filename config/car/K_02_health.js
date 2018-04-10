module.exports = function()
{
  const Health = require('modules/health');
  return new Health(
  {
    name: '/health/node',
    battery:
    {
      topic: '/car/drive/vesc/voltage', 
      batteryChemistry: 'LiPo',
      cells: 3
    }
  });
}
