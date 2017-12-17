module.exports = function()
{
  const Power = require('hw/board/beagleboneblue/power-beagleboneblue');
  return new Power(
  {
    name: '/battery/monitor',
    input: 'battery'
  });
}
