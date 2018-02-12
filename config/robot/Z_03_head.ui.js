module.exports = function()
{
  const UI = require('modules/ui');
  return new UI(
  {
    name: '/ui/head/node',
    target: '/server',
    pages:
    {
      '/head': 'config/robot/ui/head.html',
      '/js/8bit.js': './modules/8bit.js',
      '/js/8bit-webconnector.js': './modules/8bit-webconnector.js',
    }
  });
}
