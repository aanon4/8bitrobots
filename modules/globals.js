console.info('Loading Globals.');

if (require('os').type() === 'Linux')
{
  global.SIMULATOR = false;
}
else
{
  global.SIMULATOR = true;
}
