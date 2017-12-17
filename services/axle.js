console.info('Loading Axle.');

function axle(config)
{
  this._name = config.name;
  this._wheels = config.wheels;
  this._perRadian = config.time360Ms / (Math.PI * 2);
}

axle.prototype =
{
  enable: function()
  {
    this._wheels.forEach(function(wheel)
    {
      wheel.servo.enable();
    });
    return this;
  },
  
  disable: function()
  {
    this._wheels.forEach(function(wheel)
    {
      wheel.servo.disable();
    });
    return this;
  },
  
  setDirection(direction, timeMs)
  {
    this._wheels.forEach(function(wheel)
    {
      wheel.servo.setDirection(wheel.direction * direction, timeMs);
    });
  },
  
  turn: function(angleRadians)
  {
    if (angleRadians !== 0)
    {
      var direction = angleRadians < 0 ? -1 : 1;
      var timeMs = direction * angleRadians * this._perRadian;
      this._wheels.forEach(function(wheel)
      {
        switch (wheel.side)
        {
          case 'left':
            wheel.servo.setDirection(direction * wheel.direction, timeMs);
            break;
            
          case 'right':
            wheel.servo.setDirection(-direction * wheel.direction, timeMs);
            break;
            
          default:
            break;
        }
      });
    }
  }
};

module.exports = axle;
