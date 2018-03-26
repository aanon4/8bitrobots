'use strict';

console.info('Loading Gesture: Nuzzle');

let C;
let start;
let step;

function init(ctrl)
{
  C = ctrl;
}

function up()
{
  return C.runSeq(
  [
    [ 'S', 'head-ver', -0.2, 1 ],
    [ 'S', 'back-left',   step * 0.25, step == 1 ? 1.5 : 1 ],
    [ 'S', 'back-right',  step * 0.25, step == 1 ? 1.5 : 1 ],
    [ 'W',
      [ 'back-left',  '>=', 0.25 ],
      [ 'back-right', '>=', 0.25 ],
    ],
    [ 'S', 'front-left',  step * -0.1, 1 ],
    [ 'S', 'front-right', step * -0.1, 1 ],
    [ 'K', 'back-left' ],
    [ 'K', 'back-right' ],
    [ 'K', 'head-ver' ],
    [ 'I' ]
  ]);
}

function enter()
{
  start = Date.now();
  step = 1;
  return up();
}

function tick()
{
  let left = C.robot.buttonLastChange('head-left');
  let right = C.robot.buttonLastChange('head-right');
  if (left.value || right.value)
  {
    let nstep = Math.min(3, Math.max(1, Math.round((Date.now() - start) / 1500.0)));
    if (nstep != step)
    {
      step = nstep;
      return up();
    }
    return;
  }

  if ((!left.value && left.duration > 1.0) && (!right.value && right.duration > 1.0))
  {
    C.gesture('Idle');
  }
}

function exit()
{
  return C.runSeq(
  [
    [ 'S', 'back-left',   0, 2 ],
    [ 'S', 'back-right',  0, 2 ],
    [ 'S', 'front-left',  0, 1.5 ],
    [ 'S', 'front-right', 0, 1.5 ],
    [ 'S', 'head-ver',    0, 1 ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:Nuzzle': enter,
  'Nuzzle:Nuzzle': tick,
  'Nuzzle:SitUp': exit
};
