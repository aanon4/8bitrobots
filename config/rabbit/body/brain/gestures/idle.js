'use strict';

console.info('Loading Gesture: Idle');

const MP = require('modules/motion-planner');

const Limits =
{
  'head-hoz':    { low: -0.2, high:  0.2,  step: 0.03, chance: 1.0, func: MP.LINEAR             },
  'head-ver':    { low: -0.2, high: -0.05, step: 0.05, chance: 1.0                              },
  'ears':        { low: -0.4, high:  0.4,  step: 0.2,  chance: 0.2, func: MP.LINEAR, speed: 0.1 },
  'front-left':  { low:  0,   high:  0.1,  step: 0.1,  chance: 0.5                              },
  'front-right': { low:  0,   high:  0.1,  step: 0.1,  chance: 0.5                              },
}

let Pos =
[
  { name: 'head-hoz',    pos: 0 },
  { name: 'head-ver',    pos: 0 },
  { name: 'ears',        pos: 0 },
  { name: 'front-left',  pos: 0 },
  { name: 'front-right', pos: 0 },
];

let C;

function init(ctrl)
{
  C = ctrl;
}

function tick()
{
  if (C.robot.velocityActual('forward') || C.robot.velocityActual('strafe'))
  {
    C.gesture('Driving');
    return;
  }

  let left = C.robot.buttonLastChange('head-left');
  let right = C.robot.buttonLastChange('head-right');
  let back = C.robot.buttonLastChange('back');

  if (back.value && back.duration > 0.5)
  {
    C.gesture('NuzzleDown');
    return;
  }

  if (!left.value && !right.value && Math.random() > 0.02)
  {
    return;
  }

  let speed = 0.5 * (1 + Math.random());
  let script = [];
  for (let i = 0; i < Pos.length; i++)
  {
    const p = Pos[i];
    const l = Limits[p.name];

    let pos = p.pos;
    let chance = l.chance;
    if (p.name == 'head-hoz' && (left.value || right.value))
    {
      if (left.value)
      {
        pos = -0.2 * Math.random();
      }
      else
      {
        pos = 0.2 * Math.random();
      }
      chance = 0;
    }
    else if (p.name == 'ears' && (left.value || right.value))
    {
      chance = 0.8;
    }
    if (Math.random() <= chance)
    {
      let steps = (l.high - l.low) / l.step;
      pos = l.low + l.step * Math.round(Math.random() * steps);
    }
    if (pos != p.pos)
    {
      p.pos = pos;
      script = script.concat(
      [
        [ 'S', p.name, pos, l.speed ? l.speed : speed, l.func ]
      ]);
    }
  }
  if (script.length)
  {
    return C.runSeq(script.concat([ [ 'I' ] ]));
  }
  else
  {
    return false;
  }
}

function enter()
{
  for (let i = 0; i < Pos.length; i++)
  {
    Pos[i].pos = 0;
  }
  return C.runSeq(
  [
    [ 'S', 'head-ver',    0, 0.5 ],
    [ 'S', 'head-hoz',    0, 0.5 ],
    [ 'S', 'front-left',  0, 0.5 ],
    [ 'S', 'front-right', 0, 0.5 ],
    [ 'S', 'back-left',   0, 0.5 ],
    [ 'S', 'back-right',  0, 0.5 ],
    [ 'S', 'ears',        0, 0.5 ],
    [ 'I' ]
  ]);
}

function exit()
{
  let left = C.robot.buttonLastChange('head-left');
  let right = C.robot.buttonLastChange('head-right');
  let pos = 0;
  if (left.value)
  {
    pos = -0.2;
  }
  else if (right.value)
  {
    pos = 0.2;
  }

  return C.runSeq(
  [
    [ 'S', 'head-ver',    pos ? -0.2 : 0, 0.3 ],
    [ 'S', 'head-hoz',    pos, 0.3 ],
    [ 'S', 'front-left',  0,   0.3 ],
    [ 'S', 'front-right', 0,   0.3 ],
    [ 'S', 'back-left',   0,   0.3 ],
    [ 'S', 'back-right',  0,   0.3 ],
    [ 'S', 'ears',        0,   0.3 ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:Idle': enter,
  'Idle:Idle': tick,
  'Idle:SitUp': exit,
};
