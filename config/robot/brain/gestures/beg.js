'use strict';

console.info('Loading Gesture: Beg');

let C;

function init(ctrl)
{
  C = ctrl;
}

function enter()
{
  return C.runSeq(
  [
    [ 'E', 'back-left' ],
    [ 'E', 'back-right' ],
    [ 'E', 'front-left' ],
    [ 'E', 'front-right' ],
    [ 'E', 'head-ver' ],
    [ 'S', 'back-left',   0.10, 0.1, 'L' ],
    [ 'S', 'back-right',  0.10, 0.1, 'L' ],
    [ 'S', 'back-left',   1.10, 2, 'I' ],
    [ 'S', 'back-right',  1.10, 2, 'I' ],
    [ 'W',
      [ 'back-left',  '>=', 0.25 ],
      [ 'back-right', '>=', 0.25 ],
    ],
    [ 'S', 'front-left',  1.75, 1 ],
    [ 'S', 'front-right', 1.75, 1 ],
    [ 'I' ]
  ]);
}

function exit()
{
  return C.runSeq(
  [
    [ 'S', 'head-ver',    0, 1 ],
    [ 'S', 'back-left',   0, 2 ],
    [ 'S', 'back-right',  0, 2 ],
    [ 'S', 'front-left',  0, 1.5 ],
    [ 'S', 'front-right', 0, 1.5 ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:Beg': enter,
  'Beg:Beg': null,
  'Beg:SitUp': exit
};
