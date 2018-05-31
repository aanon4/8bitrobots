function car(name)
{
  const state =
  {
    x: 0,
    y: 0,
    velocity: 0,
    angle: 0,
  };

  return function(args)
  {
    // Set any properties we pass in
    for (let prop in args)
    {
      if (prop in state)
      {
        switch (prop)
        {
          case 'velocity':
          case 'angle':
            break;
          default:
            state[prop] = args[prop];
            break;
        }
      }
    }
 
    let strafe = Math.min(Math.max(state.x, -1), 1);
    let forward = Math.min(Math.max(state.y, -1), 1);;

    // Make these ramp up for better slow speed control
    forward = (forward < 0 ? -1 : 1) * (forward * forward);
    strafe = (strafe < 0 ? -1 : 1) * (strafe * strafe);

    state.velocity = forward;
    state.angle = Math.atan2(strafe, 1) / Math.PI * 180;

    return state;
  }
}

module.exports = car;
