'use strict';

console.info('Loading Gesture: Dig');

let C;

function init(ctrl)
{
  C = ctrl;
}

function enter()
{
  return C.runSeq(
  [
    [ 'S', 'front-left',  0.1, 0.2 ],
    [ 'I' ],
  ]);
}

function tick()
{
  return C.runSeq(
  [
    [ 'S', 'front-left',  0,   0.2 ],
    [ 'S', 'front-right', 0.1, 0.2 ],
    [ 'I' ],
    [ 'S', 'front-left',  0.1, 0.2 ],
    [ 'S', 'front-right', 0,   0.2 ],
    [ 'I' ],
  ]);
}

function exit()
{
  return C.runSeq(
  [
    [ 'S', 'front-left',   0, 0.2 ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:Dig': enter,
  'Dig:Dig': tick,
  'Dig:SitUp': exit
};
