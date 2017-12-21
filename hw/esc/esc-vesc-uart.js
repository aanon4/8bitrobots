console.info('Loading VESCs (UART).');

function vesc(config)
{
  this._node = rosNode.init(config.name);
}

vesc.prototype =
{
  enable: function()
  {
    return this;
  },

  disable: function()
  {
    return this;
  },

  setRPM: function(rpm)
  {
  },

  getRPM: function()
  {
  },

  isChanging: function()
  {
  }
};

module.exports = vesc;
