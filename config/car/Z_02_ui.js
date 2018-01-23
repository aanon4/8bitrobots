module.exports = function()
{
  const UI = require('modules/ui');
  return new UI(
  {
    name: '/ui/node',
    pages:
    {
      '/': 'config/car/ui/controller.html',
      '/js/ros.js': './modules/ros.js',
      '/js/ros-webconnector.js': './modules/ros-webconnector.js',
      '/image/compass.png': 'config/car/ui/compass.png'
    }
  });
}
