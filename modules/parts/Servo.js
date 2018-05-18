function servo(name)
{
  return function(args)
  {
    return 1.5 + 0.5 * args.value / 90;
  }
}

module.exports = servo;
