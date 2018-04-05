module.exports = function()
{
  const Browser = require('modules/browser');
  return new Browser(
  {
    name: '/head/browser/node',
    startup: 'http://127.0.0.1/wait.html'
  });
}
