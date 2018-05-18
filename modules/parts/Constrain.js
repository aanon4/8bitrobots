function constrain(name)
{
  return function(args)
  {
    const deadband = args.deadband;
    const value = args.value;
    if (Math.abs(value) <= deadband)
    {
      return 0;
    }
    else if (value > 0)
    {
      return Math.min(args.max, value - deadband);
    }
    else
    {
      return Math.max(args.min, value + deadband);
    }
  }
}

module.exports = constrain;
