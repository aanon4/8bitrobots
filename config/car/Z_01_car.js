
module.exports = function()
{
  const Car = require('vehicle/car');

  return new Car(
  {
    name: '/car/node',
    axle: '/car/drive',
    velocityScale: 5.0
  });
};
