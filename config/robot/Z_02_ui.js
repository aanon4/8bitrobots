module.exports = function()
{
  const UI = require('services/ui');
  return new UI(
  {
    name: '/ui',
    camera: '/camera',
    pages:
    {
      '/': 'config/robot/ui/controller.html',
      '/head': 'config/robot/ui/head.html',
      '/js/ros.js': './services/ros.js',
      '/js/ros-webconnector.js': './services/ros-webconnector.js',
    }
  });
}
