function car(name)
{
  return function(args)
  {
    let strafe = Math.min(Math.max(args.x, -1), 1);
    let forward = Math.min(Math.max(args.y, -1), 1);;

    // Make these ramp up for better slow speed control
    forward = (forward < 0 ? -1 : 1) * (forward * forward);
    strafe = (strafe < 0 ? -1 : 1) * (strafe * strafe);

    if (args.output === 'velocity')
    {
      return forward;
    }
    else
    {
      return Math.atan2(strafe, 1) / Math.PI * 180;
    }
  }
}

module.exports = car;
