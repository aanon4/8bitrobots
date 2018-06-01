function motor(name)
{
  const node = Node.init(`/app/motor/${name}/node`);

  let set_duty = null;
  const state =
  {
    channel: null,
    rev: false,
    min: -1,
    max: 1,
    velocity: 0,
    time: 0,
    func: null,
    duty: null
  };

  return function(args)
  {
    // Set any properties we pass in
    for (let prop in args)
    {
      if (args[prop] !== undefined && prop in state)
      {
        switch (prop)
        {
          case 'channel':
            if (state.channel !== args.channel)
            {
              if (set_duty)
              {
                node.unproxy({ service: state.channel });
              }
              state.channel = args.channel;
              set_duty = node.proxy({ service: state.channel });
            }
            break;
          case 'duty':
            break;
          default:
            state[prop] = args[prop];
            break;
        }
      }
    }

    let velocity = state.rev ? -state.velocity : state.velocity;
    velocity = Math.max((Math.min(velocity, state.max), velocity.min);

    const nduty = 1.5 + velocity * 0.5;
    if (nduty !== state.duty)
    {
      // Duty has changed, set the new duty output
      state.duty = nduty;
      if (set_duty)
      {
        set_duty({ duty: state.duty, time: state.time, func: state.func });
      }
    }

    return state;
  }
}

module.exports = motor;
