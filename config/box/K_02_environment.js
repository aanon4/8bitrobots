module.exports = function()
{
  const Environment = require('modules/environment');
  return new Environment(
  {
    name: '/environment/node',
    external: [ '/atmos' ]
  });
}
