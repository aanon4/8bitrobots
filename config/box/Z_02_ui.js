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
      '/js/8bit-slave.js': './modules/8bit-slave.js',
      '/js/three.js': './node_modules/three/build/three.min.js',
      '/image/compass.png': 'config/box/ui/compass.png',

      // Blockly
      '/program': 'config/box/ui/blockly.html',
      '/blockly/blockly_compressed.js': 'modules/blockly/blockly_compressed.js',
      '/blockly/blocks_compressed.js': 'modules//blockly/blocks_compressed.js',
      '/blockly/msg/js/': 'modules/blockly/msg/js/',
      '/blockly/8bitblocks.js': 'modules/blockly/8bitblocks.js'
    }
  });
}
