'use strict';

console.info("Loading GPIO button.");

const TOPIC_CURVAL = { topic: 'button_state', schema: { button_state: 'Boolean' } };

function button(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._gpio = config.gpio;
  this._enabled = 0;
}

button.prototype =
{
  get: function()
  {
    return !!this._gpio.get();
  },

  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._gpio.enable();
      this._gpio.dir('input');
      this._adVal = this._node.advertise(TOPIC_CURVAL);
      this._onChange();
    }
    return this;
  },

  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._node.unadvertise(TOPIC_CURVAL);
      this._gpio.disable();
    }
    return this;
  },

  _onChange: function()
  {
    this._adVal.publish({ button_state: this.get() });
    this._gpio.onEdge('both', (value) =>
    {
      this._adVal.publish({ button_state: !!value });
    });
  }
};

module.exports = button;
