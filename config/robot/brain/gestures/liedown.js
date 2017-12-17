'use strict';

console.info('Loading Gesture: LieDown');

let C;

function init(ctrl)
{
  C = ctrl;
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

function exit()
{
  return C.runSeq(
  [
    [ 'S', 'head-ver',    0, 1.7 ],
    [ 'S', 'head-hoz',    0, 1.7 ],
    [ 'S', 'front-left',  0, 1.5 ],
    [ 'S', 'front-right', 0, 1.5 ],
    [ 'W', 
      [ 'front-left',  '<=', 1.7 ],
      [ 'front-right', '<=', 1.7 ]
    ],
    [ 'S', 'back-left',   0.10, 1.4, 'O' ],
    [ 'S', 'back-right',  0.10, 1.4, 'O' ],
    [ 'S', 'back-left',   0,    0.4, 'I' ],
    [ 'S', 'back-right',  0,    0.4, 'I' ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:LieDown': enter,
  'LieDown:LieDown': null,
  'LieDown:SitUp': exit,
};
