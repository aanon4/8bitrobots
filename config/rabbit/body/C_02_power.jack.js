module.exports = function()
{
  const Power = require('hw/board/beagleboneblue/power');
  return new Power(
  {
    name: '/jack/node',
    input: 'jack'
  });
}
