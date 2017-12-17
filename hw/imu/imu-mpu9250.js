console.info('Loading MPU9250 IMU sensors.');

function imu(config)
{
  this._name = config.name;
  this._i2c = config.i2c;
  this._clock = null;
}

imu.prototype =
{
  enable: function()
  {
    console.log('*** Not Implemented ***');
    //this._clock = setInterval(() => {
    //  this._processTick();
    //}, 100);
    return this;
  },

  disable: function()
  {
    //clearInterval(this._clock);
    return this;
  },

  _processTick: function()
  {
    this._updateQuaternion();
  },

  _updateQuaternion: function()
  {
  }
}

module.exports = imu;
