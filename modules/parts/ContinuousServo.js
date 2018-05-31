function motor(name)
{
  const node = Node.init(`/app/continuous-servo/${name}/node`);

  let set_pulse = null;
  const state =
  {
    channel: null,
    rev: false,
    min: -1,
    max: 1,
    velocity: null,
    time: 0,
    func: null,
    pulse: null
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
          case 'channel':
            if (state.channel !== args.channel)
            {
              if (set_pulse)
              {
                node.unservice({ name: state.channel });
              }
              state.channel = args.channel;
              set_pulse = node.service({ name: state.channel });
            }
            break;
          case 'pulse':
            break;
          default:
            state[prop] = args[prop];
            break;
        }
      }
    }

    let velocity = state.rev ? -state.velocity : state.velocity;
    velocity = Math.max((Math.min(velocity, state.max), velocity.min);

    const npulse = 1.5 + velocity * 0.5;
    if (npulse !== state.pulse)
    {
      // Pulse has changed, set the new pulse output
      state.pulse = npulse;
      if (set_pulse)
      {
        set_pulse({ pulse: state.pulse, time: state.time, func: state.func });
      }
    }
  }

  return state;
}

module.exports = motor;
