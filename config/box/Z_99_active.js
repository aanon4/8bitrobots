module.exports = function()
{
  const LED = typeof PWM !== 'undefined' ? PWM.open({ channel: 10 }) : null;

  return {
    _name: '/activity/node',
    _enabled: 0,

    enable: () => {
      if (this._enabled++ === 0)
      {
        if (LED)
        {
          LED.enable()
          LED.setDutyCycle(0.01);
        }
      }
      return this;
    },

    disable: () => {
      if (--this._enabled === 0)
      {
        if (LED)
        {
          LED.setDutyCycle(0);
          LED.disable();
        }
      }
      return this;
    }
  };
};
