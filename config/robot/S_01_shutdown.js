module.exports = function()
{
  const Shutdown = require('services/shutdown');
  return new Shutdown(
  {
    name: '/shutdown/node'
  });
}
