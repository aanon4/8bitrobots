console.info('Loading Lights.');

const SERVICE_SETLIGHTS = { service: 'set_lights' };

function lights(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;
  this._pwm = config.pwm;
}

lights.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._pwm.enable();
      this.setOn(0);
      this._node.service(SERVICE_SETLIGHTS, (request) =>
      {
        this.setOn(request.on);
      });
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._node.unservice(SERVICE_SETLIGHTS);
      this.setOn(0);
      this._pwm.disable();
    }
    return this;
  },
  
  setOn: function(on)
  {
    this._pwm.setDutyCycle(on);
  }
}

module.exports = lights;
