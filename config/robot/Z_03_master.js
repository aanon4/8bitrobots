module.exports = function()
{
  const Master = require('modules/master');
  return new Master(
  {
    name: '/master/node'
  });
}
