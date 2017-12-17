'use strict';

console.info('Loading Gesture: Sleep');

let C;

function init(ctrl)
{
  C = ctrl;
}

function enter()
{
  return C.runSeq(
  [
    [ 'S', 'head-ver',    -0.6,  3      ],
    [ 'S', 'front-left',   1.90, 3      ],
    [ 'S', 'front-right',  1.90, 3      ],
    [ 'S', 'back-left',   -0.65, 3      ],
    [ 'S', 'back-right',  -0.65, 3      ],
    [ 'S', 'head-ver',     0,    2, 'I' ],
    [ 'S', 'head-hoz',     0,    3      ],
    [ 'I' ],
  ]);
}

function tick()
{
  const TIMEOUT = 0.5;

  const left = C.robot.buttonLastChange('head-left');
  const right = C.robot.buttonLastChange('head-right');
  const back = C.robot.buttonLastChange('back');

  if (
    (left.value && left.duration > TIMEOUT) ||
    (right.value && right.duration > TIMEOUT) ||
    (back.value && back.duration > TIMEOUT))
  {
    C.gesture('Idle');
  }
}

function exit()
{
  const left = C.robot.buttonLastChange('head-left');
  const right = C.robot.buttonLastChange('head-right');
  const hoz = !(left.value ^ right.value) ? 0 : left.value ? -0.2 : 0.2;
  return C.runSeq(
  [
    [ 'S', 'head-ver',   -0.6,  1   ],
    [ 'S', 'head-hoz',    hoz,  1   ],
    [ 'Z', 1 ],
    [ 'S', 'front-left',  0,    3.0 ],
    [ 'S', 'front-right', 0,    3.0 ],
    [ 'W', 
      [ 'front-left',  '<=', 1.6 ],
      [ 'front-right', '<=', 1.6 ]
    ],
    [ 'S', 'back-left',   0.10,  1.4, 'O' ],
    [ 'S', 'back-right',  0.10,  1.4, 'O' ],
    [ 'S', 'back-left',   0,     0.4, 'I' ],
    [ 'S', 'back-right',  0,     0.4, 'I' ],
    [ 'S', 'head-ver',    0,     1.5, 'I' ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:Sleep': enter,
  'Sleep:Sleep': tick,
  'Sleep:SitUp': exit,
};
