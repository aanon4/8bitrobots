
module.exports = function()
{
  const Vision = require('services/vision/vision-opencv');

  return new Vision(
  {
    name: '/car/vision/node'
  });
};
