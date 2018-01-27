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
      '/js/ros.js': './modules/ros.js',
      '/js/ros-webconnector.js': './modules/ros-webconnector.js',
    }
  });
}
