module.exports = function()
{
  const UI = require('services/ui');
  return new UI(
  {
    name: '/ui',
    pages:
    {
      '/': 'config/car/ui/controller.html',
      '/js/ros.js': './services/ros.js',
      '/js/ros-webconnector.js': 'config/robot/ui/ros-webconnector.js',
    }
  });
}