'use strict';

console.info('Loading Gesture: Walk');

let C;

function init(ctrl)
{
  C = ctrl;
}

function enter()
{
  return C.runSeq(
  [
    [ 'S', 'back-left',    0.05, 0.3 ],
    [ 'S', 'back-right',   0.05, 0.3 ],
    [ 'S', 'front-left',   0.1,  0.5 ],
    [ 'I' ],
    [ 'M', 'left',  0.17, 0 ],
    [ 'M', 'right', 0.17, 0 ],
    [ 'K', 'back-left' ],
    [ 'K', 'back-right' ]
  ]);
}

function tick()
{
  return C.runSeq(
  [
    [ 'S', 'front-left',  0,   0.5 ],
    [ 'S', 'front-right', 0.1, 0.5 ],
    [ 'I' ],
    [ 'S', 'front-left',  0.1, 0.5 ],
    [ 'S', 'front-right', 0,   0.5 ],
    [ 'I' ],
  ]);
}

function exit()
{
  return C.runSeq(
  [
    [ 'M', 'left',  0, 0 ],
    [ 'M', 'right', 0, 0 ],
    [ 'S', 'front-left',   0, 0.5 ],
    [ 'S', 'back-left',    0, 0.2 ],
    [ 'S', 'back-right',   0, 0.2 ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:Walk': enter,
  'Walk:Walk': tick,
  'Walk:SitUp': exit
};
