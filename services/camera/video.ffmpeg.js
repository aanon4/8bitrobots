console.info('Loading Video (raspivid/ffmpeg).');

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
    fps: 49,
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
    response.writeHead(200, { 'Content-Type': 'video/mp4' });

    // If we don't support stereo cameras, always select the left one.
    if (nr != 0 && this._right === undefined)
    {
      nr = 0;
    }
    var selected = (nr == 0 ? config.mono : config.stereo);

    this.httpStop();

    var child = childProcess.spawn('/bin/sh',
    [
      '-c',
      [
        '/usr/bin/raspivid',
        '--nopreview',
        '--timeout', 0,
        '--framerate', selected.fps,
        '--width', selected.width,
        '--height', selected.height,
        '--bitrate', selected.bitrate,
        '--inline',
        '--flush',
        '--profile', 'high',
        '--intra', 100,
        (this._flip ? '--vflip' : ''),
        (this._flip ? '--hflip' : ''),
        '--stereo', (nr == 0 ? 'off' : 'sbs'),
        '--camselect', this._left,
        (nr != 0 && this._left == 0) ? '--3dswap' : '',
        '-o', '-',

        '|',

        '/usr/bin/ffmpeg',
        '-v', 0,
        '-probesize', 32,
        '-fflags', 'nobuffer',
        '-analyzeduration', 0,
        '-max_delay', 0,
        '-r', selected.fps * 2,
        '-i', '-',
        '-f', 'mp4',
        '-vcodec', 'copy',
        '-frag_duration', 1,
        '-'
      ].join(' ')
    ],
    {
      stdio: [ 'ignore', response.socket._handle.fd, /*'inherit'*/'ignore' ]
    });

    const self = this;
    response.on('close', function()
    {
      if (child === self._running)
      {
        self.httpStop();
      }
    });
    this._running = child;

    return true;
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
