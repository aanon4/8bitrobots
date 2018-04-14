console.info('Loading Vision (opencv).');

const childProcess = require('child_process');
const os = require('os');
const path = require('path');

function vision(config)
{
  this._name = config.name;
  this._running = null;
  this._enabled = 0;
}

vision.prototype =
{  
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      if (!SIMULATOR)
      {
        process.on('exit', () => {
          this._stop();
        });
      }
      this._start();
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._stop();
    }
    return this;
  },
  
  _start: function()
  {
    this._stop();

    this._running = childProcess.spawn('/bin/sh',
    [
      '-c',
      [
        'exec',
        `${path.dirname(module.filename)}/RobotVision/build/RobotVision`
      ].join(' ')
    ],
    {
      stdio: [ 'ignore', 'ignore', 'ignore' ]
    });
  },

  _stop: function()
  {
    if (this._running)
    {
      childProcess.spawnSync('/usr/bin/pkill', [ '-9', '-P', this._running.pid ]);
      this._running = null;
    }
  }
}

module.exports = vision;
