module.exports = function()
{
  const UI = require('modules/ui');
  return new UI(
  {
    name: '/ui/node',
    target: '/server',
    pages:
    {
      '/': 'config/box/ui/controller.html',
      '/js/8bit.js': './modules/8bit.js',
      '/js/8bit-webconnector.js': './modules/8bit-webconnector.js',
      '/image/compass.png': 'config/box/ui/compass.png',

      // Blockly
      '/blockly/blockly_compressed.js': './modules//blockly/blockly_compressed.js',
      '/blockly/blocks_compressed.js': '/modules//blockly/blockly_compressed.js',
      '/blockly/msg/js/': './modules/msg/js/',
      '/blockly/8bitblocks.js': './modules/blockly/8bitblocks.js'
    }
  });
}
