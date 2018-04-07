'use strict';

module.exports = function()
{
  const Robot = require('vehicle/robot');
  const StateManager = require('modules/state-manager');
  const ServoPwm = require('hw/board/beagleboneblue/servos');
  const Motors = require('hw/board/beagleboneblue/motors');

  const Motor = require('hw/motor/gearmotor-120:1');
  const Wheel = require('hw/wheel/wheel-42mm');
  const Servos =
  {
    hs422:   require('hw/servo/servo-hs422'),
    hs645mg: require('hw/servo/servo-hs645mg'),
    hs35hd:  require('hw/servo/servo-hs35hd')
  };

  const HBRIDGES = Motors.open();
  const SERVOS = ServoPwm.open();
  const stateManager = new StateManager({ name: 'robot-servo' });

  function makeWheel(id, dev, rev)
  {
    return {
      [id]: new Wheel(
      {
        name: `/robot/${id}/wheel/node`,
        motor: new Motor(
        {
          name: `/robot/${id}/wheel/motor/node`,
          hbridge: HBRIDGES.open({ channel: dev }),
          reverse: rev == 'rev' ? true : false
        })
      })
    };
  }
  function makeServo(id, dev, type, rev, safeMin, safeMax, safeDefault, trim)
  {
    return {
      [id]: new Servos[type](
      {
        name: `/robot/${id}/servo/node`,
        pwm: SERVOS.open({ channel: dev }),
        reverse: rev == 'rev' ? true : false,
        minAngle: safeMin,
        maxAngle: safeMax,
        defaultAngle: safeDefault,
        trim: trim,
        stateManager: stateManager
      })
    };
  }
  function makeButton(id, dev, type)
  {
    const Button = require(`hw/buttons/${type}`);
    return {
      [id]: new Button(
      {
        name: `/robot/${id}/button/node`,
        gpio: GPIO.open({ channel: dev })
      })
    }
  }

  return new Robot(
  {
    name: '/robot/node',
    brain: require('config/rabbit/body/brain/robot'),
    wheels: Object.assign({},
      makeWheel('left', 3, 'nor'),
      makeWheel('right', 2, 'rev')
    ),
    servos: Object.assign({},
      makeServo('back-right',  7, 'hs645mg',  'rev', Math.PI / 2 - 1.5,  Math.PI / 2 + 2.5,  Math.PI / 2, -0.30),
      makeServo('back-left',   0, 'hs645mg',  'nor', Math.PI / 2 - 1.5,  Math.PI / 2 + 2.5,  Math.PI / 2, -0.45),
      makeServo('front-left',  5, 'hs422',    'nor', Math.PI / 2 - 2.5,  Math.PI / 2 + 2.5,  Math.PI / 2, -0.25),
      makeServo('front-right', 4, 'hs422',    'rev', Math.PI / 2 - 2.5,  Math.PI / 2 + 2.5,  Math.PI / 2, -0.33),
      makeServo('head-hoz',    3, 'hs422',    'nor', Math.PI / 2 - 0.5,  Math.PI / 2 + 0.5 , Math.PI / 2, -0.25),
      makeServo('head-ver',    2, 'hs645mg',  'nor', Math.PI / 2 - 0.6,  Math.PI / 2,        Math.PI / 2,  0.25),
      makeServo('ears',        1, 'hs35hd',   'nor', Math.PI / 2 - 0.5,  Math.PI / 2 + 0.5,  Math.PI / 2, -1.05)
    ),
    buttons: Object.assign({},
      makeButton('head-right', 0, 'button-gpio'),
      makeButton('head-left',  1, 'button-gpio'),
      makeButton('back',       2, 'button-gpio'),
     {}
    )
  });
}
