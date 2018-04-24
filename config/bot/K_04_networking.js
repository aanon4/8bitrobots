module.exports = function()
{
  const Networking = require('modules/networking');
  return new Networking(
  {
    name: '/networking/node'
  });
}
