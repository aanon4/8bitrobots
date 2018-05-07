module.exports = function()
{
  const ServerConfig = require('modules/server-config');
  return new ServerConfig(
  {
    name: '/blockly/node',
    server: '/server',
    pages:
    {
      '/program': 'config/bot/ui/blockly.html',
      '/blockly/blockly_compressed.js': 'modules/blockly/blockly_compressed.js',
      '/blockly/blocks_compressed.js': 'modules/blockly/blocks_compressed.js',
      '/blockly/javascript_compressed.js': 'modules/blockly/javascript_compressed.js',
      '/blockly/msg/js/': 'modules/blockly/msg/js/',
      '/blockly/8bitblocks.js': 'modules/blockly/8bitblocks.js',
      '/blockly/8bitparts.js': 'modules/blockly/8bitparts.js',
      '/blockly/8bitapp.js': 'modules/blockly/8bitapp.js',
      '/images/sprites.png': 'modules/blockly/sprites.png'
    }
  });
}
