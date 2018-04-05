module.exports = function()
{
  const LED = typeof PWM !== 'undefined' ? PWM.open({ channel: 8 }) : null;

  return {
    _name: '/activity/node',

    enable: () => {
      LED && LED.enable()
      LED && LED.setDutyCycle(0.01);
      return this;
    },

    disable: () => {
      LED && LED.setDutyCycle(0);
      LED && LED.disable();
      return this;
    }
  };
};
