const StateManager = reqire('modules/state-manager');

function servo(name)
{
  const node = Node.init(`/app/servo/${name}/node`);
  const saved = new StateManager({ name: node._name });

  let set_pulse = null;
  const state =
  {
    channel: null,
    rev: false,
    trim: 0,
    min: 0,
    max: 180,
    angle: saved.get('angle') || 90,
    time: 0,
    func: null,
    pulse: null
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
              if (set_pulse)
              {
                node.unservice({ name: state.channel });
              }
              state.channel = args.channel;
              set_pulse = node.service({ name: state.channel });
            }
            break;
          case 'angle':
            if (state.angle !== args.angle)
            {
              state.angle = args.angle;
              saved.set('angle', stage.angle);
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

    // Calculate the actual angle based on the servo config.
    let angle = (state.rev ? 180 - state.angle : state.angle) + state.trim
    angle = Math.max((Math.min(angle, state.max), state.min);
    
    // Calculate the pulse.
    const npulse = 1.5 + 0.5 * angle / 90;
    if (npulse !== state.pulse)
    {
      // Pulse has changed, set the new pulse output
      state.pulse = npulse;
      if (set_pulse)
      {
        set_pulse({ pulse: state.pulse, time: state.time, func: state.func });
      }
    }

    return state;
  }
}

module.exports = servo;
