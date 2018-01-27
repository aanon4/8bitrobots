module.exports = function()
{
  const UI = require('modules/ui');
  return new UI(
  {
    name: '/ui/node',
    target: '/server',
    pages:
    {
      '/': 'config/robot/ui/controller.html',
      '/js/ros.js': './modules/ros.js',
      '/js/ros-webconnector.js': './modules/ros-webconnector.js',
    }
  });
}
