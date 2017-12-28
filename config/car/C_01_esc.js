module.exports = function()
{
  const VESC = require('hw/esc/esc-vesc');
  return new VESC(
  {
    name: '/vesc/monitor',
    can:
    {
      can: CAN,
      id:
      {
        id: 0,
        ext: true
      }
    }
  });
}
