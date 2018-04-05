module.exports = function()
{
  const Slave = require('modules/8bit-slave');
  return new Slave(
  {
    name: '/head/slave/node',
    target: '192.168.8.1'
  });
}
