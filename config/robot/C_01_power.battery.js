module.exports = function()
{
  const Power = require('hw/board/beagleboneblue/power');
  return new Power(
  {
    name: '/battery/node',
    input: 'battery'
  });
}
