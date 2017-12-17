'use strict';

console.info('Loading Gesture: Wave (L)');

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
    [ 'S', 'front-left', 1.6, 1 ],
    [ 'I' ],
  ]);
}

function tick()
{
  return C.runSeq(
  [
    [ 'E', 'back-left' ],
    [ 'S', 'front-left', 1.2, 0.4 ],
    [ 'I' ],
    [ 'S', 'front-left', 1.6, 0.4 ],
    [ 'I' ],
  ]);
}

function exit()
{
  return C.runSeq(
  [
    [ 'S', 'front-left', 0, 1 ],
    [ 'I' ]
  ]);
}

module.exports =
{
  init,
  'SitUp:WaveLeft': enter,
  'WaveLeft:WaveLeft': tick,
  'WaveLeft:SitUp': exit
};
