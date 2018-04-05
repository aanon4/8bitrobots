module.exports = function()
{
  const UI = require('modules/ui');
  return new UI(
  {
    name: '/head/ui/node',
    target: '/head/server',
    pages:
    {
      '/wait.html': 'config/rabbit/head/ui/wait.html'
    }
  });
}
