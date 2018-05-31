function tank(name)
{
  const state =
  {
    x: 0,
    y: 0,
    left: 0,
    right: 0,
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
          case 'left':
          case 'right':
            break;
          default:
            state[prop] = args[prop];
            break;
        }
      }
    }

    let strafe = Math.min(Math.max(state.x, -1), 1);
    // Make these ramp up for better slow speed control
    strafe = 0.75 * (strafe < 0 ? -1 : 1) * (strafe * strafe);
  
    let forward = Math.min(Math.max(state.y, -1), 1);
    // Make these ramp up for better slow speed control
    forward = (forward < 0 ? -1 : 1) * (forward * forward);

    state.right = Math.min(Math.max(forward - strafe, -1), 1);
    state.left = Math.min(Math.max(forward + strafe, -1), 1);

    return state;
  }
}

module.exports = tank;
