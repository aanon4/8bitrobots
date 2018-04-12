module.exports = function()
{
  const LED = typeof PWM !== 'undefined' ? PWM.open({ channel: 10 }) : null;

  return {
    _name: '/activity/node',

    enable: () => {
      if (LED)
      {
        LED.enable()
        LED.setDutyCycle(0.01);
      }
      return this;
    },

    disable: () => {
      if (LED)
      {
        LED.setDutyCycle(0);
        LED.disable();
      }
      return this;
    }
  };
};
