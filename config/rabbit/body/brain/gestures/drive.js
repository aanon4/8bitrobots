'use strict';

console.info('Loading Gesture: Driving');

let C;
let P;

function init(ctrl)
{
  C = ctrl;
  P = C.robot;
}

const IDLE_TIMEOUT = 500;
let idleTime = null;

function enter()
{
  P.servoIdle('head-hoz', false);
}

function tick()
{
  let forward = P.velocityActual('forward');
  let strafe = P.velocityActual('strafe') / 2;

  if (forward || strafe)
  {
    idleTime = null;
    if (!P.wheelIsChanging('left') && !P.wheelIsChanging('right'))
    {
      P.wheelActual('left', forward + strafe, 0);
      P.wheelActual('right', forward - strafe, 0);
    }
    if (!P.servoIsChanging('head-hoz'))
    {
      if (strafe < 0)
      {
        P.servoActual('head-hoz', Math.PI / 2 - 0.25, 700);
      }
      else if (strafe > 0)
      {
        P.servoActual('head-hoz', Math.PI / 2 + 0.25, 700);
      }
      else
      {
        P.servoActual('head-hoz', Math.PI / 2, 500);
      }
    }
  }
  else if (!idleTime)
  {
    idleTime = Date.now() + IDLE_TIMEOUT;
  }
  else if (Date.now() >= idleTime)
  {
    idleTime = null;
    C.gesture('Idle');
  }
}

function exit()
{
  P.servoIdle('head-hoz', true);
  P.wheelActual('left', 0, 500);
  P.wheelActual('right', 0, 500);
}

module.exports =
{
  init,
  'LieDown:Driving': enter,
  'Driving:Driving': tick,
  'Driving:LieDown': exit
};
