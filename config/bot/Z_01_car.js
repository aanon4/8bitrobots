
module.exports = function()
{
  const Car = require('vehicle/car');

  return new Car(
  {
    name: '/car/node',
    axle: '/car/drive',
    joystick: '/controller/joystick'
  });
};
