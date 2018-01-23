module.exports = function()
{
  const Master = require('services/master');
  return new Master(
  {
    name: '/master/node'
  });
}
