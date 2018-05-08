const PI2 = Math.PI / 2;

function tank(args)
{
  const strafe = Math.min(Math.max(args.x, -1), 1);
  const forward = Math.min(Math.max(args.y, -1), 1);;
  const output = args.output;

  // No movement in any direction, so no output movement in any direction
  if (forward === 0 && strafe === 0)
  {
    return 0;
  }
  else
  {
    const velocity = (forward < 0 ? -1 : 1) * (forward * forward + strafe * strafe);
    const angle = Math.abs(Math.atan2(forward, strafe));
    const wheel = { left: 1, right: 1 };
    if (angle < PI2)
    {
      wheel.left = 1.2 * angle / PI2 - 0.2;
    }
    else if (angle > PI2)
    {
      wheel.right = -1.2 * angle / PI2 + 2.2;
    }

    return Math.min(Math.max(velocity * wheel[output], -1), 1);
  }
}

module.exports = tank;
