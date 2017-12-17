module.exports = function()
{
  const UI = require('services/ui');
  return new UI(
  {
    name: '/ui',
    camera: '/camera',
    pages:
    {
      '/': 'config/robot/ui/index.html',
      '/remote': 'config/robot/ui/remote.html',
      '/js/ros.js': './services/ros.js',
      '/js/ros-webconnector.js': 'config/robot/ui/ros-webconnector.js',
    }
  });
}
