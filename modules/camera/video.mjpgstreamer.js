console.info('Loading Video (raspivid/mjpg_streamer).');

const childProcess = require('child_process');
const os = require('os');

// NOTES:
//  Oculus: 2160x1200 (1080x1200 per eye), 90 fps
//  RaspberryPi Cam: 1296x730, 45 fps


const config =
{
  mono:
  {
    width: 1296,
    height: 730,
    fps: 30,
    bitrate: 10000000
  },
  stereo:
  {
    width: 1280,
    height: 512,
    fps: 40,
    bitrate: 10000000
  }
};


function video(config)
{
  this._name = config.name;
  this._left = config.left || 0;
  this._right = config.right;
  this._flip = config.flip || false;
  this._running = null;
}

video.prototype =
{  
  enable: function()
  {
    if (!SIMULATOR)
    {
      const self = this;
      process.on('exit', function()
      {
        self.httpStop();
      });
    }
    this.startVideo(0);
    return this;
  },
  
  disable: function()
  {
    this.httpStop();
    return this;
  },
  
  httpVideo: function(response, nr)
  {
    response.setTimeout(0);
    response.writeHead(200);

    return true;
  },

  startVideo: function(nr)
  {
    // If we don't support stereo cameras, always select the left one.
    if (nr != 0 && this._right === undefined)
    {
      nr = 0;
    }
    var selected = (nr == 0 ? config.mono : config.stereo);

    this.httpStop();

    let flip = this._flip ? '-hf -vf' : '';
    let child = childProcess.spawn('/bin/sh',
    [
      '-c',
      [
        '/usr/local/bin/mjpg_streamer',
        '-o',
        `"output_http.so -p 8081"`,
        '-i',
        `"input_raspicam.so --width ${selected.width} --height ${selected.height} -fps ${selected.fps} -quality 95 ${flip}"`
      ].join(' ')
    ],
    {
      stdio: [ 'ignore', 'ignore', 'ignore' ]
    });

    this._running = child;
  },

  httpStop: function()
  {
    if (this._running)
    {
      childProcess.spawnSync('/usr/bin/pkill', [ '-9', '-P', this._running.pid ]);
      this._running = null;
    }
  }
}

module.exports = video;
