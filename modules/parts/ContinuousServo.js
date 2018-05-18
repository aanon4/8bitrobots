function motor(name)
{
  return function(args)
  {
    return 1.5 + args.value * 0.5;
  }
}

module.exports = motor;
