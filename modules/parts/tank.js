function tank(args)
{
  let strafe = Math.min(Math.max(args.x, -1), 1);
  let forward = Math.min(Math.max(args.y, -1), 1);;

  // Make these ramp up for better slow speed control
  forward = (forward < 0 ? -1 : 1) * (forward * forward);
  strafe = (strafe < 0 ? -1 : 1) * (strafe * strafe);

  // Assume left and right wheels rotate cw and ccw
  // Note: do not reverse the strafe.
  if (args.output === 'right')
  {
    forward = -forward;
  }

  return Math.min(Math.max(forward + strafe * 0.75, -1), 1);
}

module.exports = tank;
