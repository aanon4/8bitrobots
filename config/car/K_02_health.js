module.exports = function()
{
  const Health = require('modules/health');
  return new Health(
  {
    name: '/health/node',
    battery:
    {
      topic: '/car/drive/vesc/voltage', 
      chemistry: 'LiPo',
      cells: 3
    }
  });
}
