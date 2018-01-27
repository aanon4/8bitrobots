module.exports = function()
{
  const Master = require('modules/ros-master');
  return new Master(
  {
    name: '/master/node'
  });
}
