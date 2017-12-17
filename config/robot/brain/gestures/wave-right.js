'use strict';

console.info('Loading Gesture: Wave (R)');

let C;

function init(ctrl)
{
  C = ctrl;
}

function enter()
{
  return C.runSeq(
  [
    [ 'E', 'back-right' ],
    [ 'S', 'front-right', 1.6, 1 ],
    [ 'I' ]
  ]);
}

function tick()
{
  return C.runSeq(
  [
    [ 'E', 'back-right' ],
    [ 'S', 'front-right', 1.2, 0.4 ],
    [ 'I' ],
    [ 'S', 'front-right', 1.6, 0.4 ],
    [ 'I' ],
  ]);
}

function exit()
{
  return C.runSeq(
  [
    [ 'S', 'front-right', 0, 1 ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:WaveRight': enter,
  'WaveRight:WaveRight': tick,
  'WaveRight:SitUp': exit
};
