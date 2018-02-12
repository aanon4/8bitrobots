module.exports = function()
{
  const UI = require('modules/ui');
  return new UI(
  {
    name: '/ui/node',
    target: '/server',
    pages:
    {
      '/': 'config/box/ui/controller.html',
      '/js/8bit.js': './modules/8bit.js',
      '/js/8bit-webconnector.js': './modules/8bit-webconnector.js',
      '/image/compass.png': 'config/box/ui/compass.png'
    }
  });
}
