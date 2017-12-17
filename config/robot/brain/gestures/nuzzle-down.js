'use strict';

console.info('Loading Gesture: Nuzzle Down');

let C;
let untouch = null;

function init(ctrl)
{
  C = ctrl;
  C.robot.buttonOnChange('back', (active) =>
  {
    if (active)
    {
      untouch = null;
    }
    else
    {
      untouch = Date.now();
    }
  });
}

function enter()
{
  return C.runSeq(
  [
    [ 'E', 'head-ver' ],
    [ 'S', 'front-left',   1.90, 1 ],
    [ 'S', 'front-right',  1.90, 1 ],
    [ 'S', 'back-left',   -0.65, 1 ],
    [ 'S', 'back-right',  -0.65, 1 ],
    [ 'S', 'head-ver',    -0.6,  1 ],
    [ 'S', 'head-hoz',     0,    1 ],
    [ 'I' ]
  ]);
}

function tick()
{
  if (untouch && Date.now() - untouch > 1000)
  {
    C.gesture('Idle');
  }
}

function exit()
{
  return C.runSeq(
  [
    [ 'S', 'head-ver',    0,     1.7      ],
    [ 'S', 'head-hoz',    0,     1.7      ],
    [ 'S', 'front-left',  0,     1.5, 'O' ],
    [ 'S', 'front-right', 0,     1.5, 'O' ],
    [ 'S', 'back-left',   0.10,  1.4, 'O' ],
    [ 'S', 'back-right',  0.10,  1.4, 'O' ],
    [ 'S', 'back-left',   0,     0.3, 'L' ],
    [ 'S', 'back-right',  0,     0.3, 'L' ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:NuzzleDown': enter,
  'NuzzleDown:NuzzleDown': tick,
  'NuzzleDown:SitUp': exit,
};
