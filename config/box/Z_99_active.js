module.exports = function()
{
  const LED = PWM.open({ channel: 8 });

  return {
    _name: '/activity/node',

    enable: () => {
      LED.enable()
      LED.setDutyCycle(0.01);
      return this;
    },

    disable: () => {
      LED.setDutyCycle(0);
      LED.disable();
      return this;
    }
  };
};
