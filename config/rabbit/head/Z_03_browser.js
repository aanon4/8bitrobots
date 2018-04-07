module.exports = function()
{
  const Browser = require('modules/browser');
  return new Browser(
  {
    name: '/head/browser/node',
    size: '1824,984',
    startup: 'http://192.168.88.1/head'
  });
}
