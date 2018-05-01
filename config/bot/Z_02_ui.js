module.exports = function()
{
  const ServerConfig = require('modules/server-config');
  return new ServerConfig(
  {
    name: '/ui/node',
    server: '/server',
    pages:
    {
      '/': 'config/bot/ui/controller.html',
      '/js/8bit.js': './modules/8bit.js',
      '/js/8bit-slave.js': './modules/8bit-slave.js',
      '/js/three.js': './node_modules/three/build/three.min.js',
      '/image/compass.png': 'config/bot/ui/compass.png'
    }
  });
}
