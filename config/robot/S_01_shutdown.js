module.exports = function()
{
  const Shutdown = require('modules/shutdown');
  return new Shutdown(
  {
    name: '/shutdown/node'
  });
}
