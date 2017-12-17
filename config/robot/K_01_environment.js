module.exports = function()
{
  const Environment = require('services/environment');
  return new Environment(
  {
    name: '/environment/monitor',
    internal: [ '/environ' ]
  });
}
