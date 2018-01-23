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
      '/js/ros-webconnector.js': './services/ros-webconnector.js',
      '/image/compass.png': 'config/car/ui/compass.png'
    }
  });
}
