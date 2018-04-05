module.exports = function()
{
  const Browser = require('modules/browser');
  return new Browser(
  {
    name: '/head/browser/node',
    startup: 'wait.html'
  });
}
