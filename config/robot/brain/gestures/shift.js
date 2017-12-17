'use strict';

console.info('Loading Gesture: Shift');

let C;

function init(ctrl)
{
  C = ctrl;
}

function enter()
{
  return C.runSeq(
  [
    [ 'S', 'back-left',   0.12, 0.5 ],
    [ 'W',
      [ 'back-left',  '>=', 0.15 ]
    ],
    [ 'S', 'back-right',  0.12, 0.5 ],
    [ 'W',
      [ 'back-right',  '>=', 0.05 ]
    ],
    [ 'S', 'back-left',   0.0, 0.7 ],
    [ 'W',
      [ 'back-left',  '<=', 0.15 ]
    ],
    [ 'S', 'back-right',  0.0, 0.5 ],
    [ 'I' ]
  ]);
}

function tick()
{
  C.gesture('Idle');
}

module.exports =
{
  init,
  'SitUp:Shift': enter,
  'Shift:Shift': tick,
  'Shift:SitUp': null
};
