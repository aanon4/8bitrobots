module.exports = function()
{
  const Server = require('modules/server');
  return new Server(
  {
    name: '/server/node'
  });
}
