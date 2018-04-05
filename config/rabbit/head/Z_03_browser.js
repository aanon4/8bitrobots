module.exports = function()
{
  const Browser = require('modules/browser');
  return new Browser(
  {
    name: '/head/browser/node',
    startup: 'http://192.168.8.1/head'
  });
}
