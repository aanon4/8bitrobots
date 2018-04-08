'use strict';

console.info('Loading Browser.');

const childProcess = require('child_process');
const http = require('http');
const ConfigManager = require('modules/config-manager');

const CMD_XSERVER = '/usr/bin/X';
const CMD_BROWSER = '/usr/bin/chromium';


function browser(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._config = new ConfigManager(this,
  {
    startup: config.startup || 'about:blank',
    size: config.size || '1024,768'
  });
  this._enabled = false;
}

browser.prototype =
{
  enable: function()
  {
    this._enabled = true;

    this._config.enable();
    this._startup = this._config.get('startup');
    this._size = this._config.get('size');

    this._startX();
    this._startBrowser();

    return this;
  },
  
  disable: function()
  {
    this._enabled = false;
  
    if (this._browser)
    {
      this._browser.kill();
      this._browser = null;
    }
    if (this._xserver)
    {
      this._xserver.kill();
      this._xserver = null;
    }

    this._config.disable();

    return this;
  },

  restart: function()
  {
    // Restart the browser only (X doesn't change)
    this._startup = this._config.get('startup');
    this._size = this._config.get('size');

    if (this._browser)
    {
      this._browser.kill();
      this._browser = null;
    }
    this._startBrowser();
  },

  _startX: function()
  {
    // Startup the X-server
    this._xserver = childProcess.spawn(CMD_XSERVER,
    [
      '-dpms', '-ac', '-wr', '-nocursor', '-s', '0', '-v'
    ], 
    {
      stdio: [ 'ignore', 'ignore', 'ignore' ]
    });
  },

  _startBrowser: function()
  {
    // Poll the startup page until we can load it, then launch the browser.
    const startup = () => {
      http.get(this._startup, (result) => {
        if (!this._enabled)
        {
          // Bail
          return;
        }
        else if (result.statusCode !== 200)
        {
          // Not loading - retry
          console.warn(`Browser page ${this._startup} retry`);
          setTimeout(startup, 2000);
        }
        else
        {
          // Start the browser
          this._browser = childProcess.spawn(CMD_BROWSER,
          [
            '--no-first-run',
            '--no-sandbox',
            '--noerrordialogs',
            `--window-size=${this._size}`,
            `--app=${this._startup}`
          ],
          {
            env:
            {
              DISPLAY: ':0.0'
            },
            stdio: [ 'ignore', 'ignore', 'ignore' ]
          });
        }
      }).on('error', (e) => {
        // Not loading (network not there yet?) - retry
        console.warn(`Browser error ${this._startup} retry`);
        setTimeout(startup, 2000);
      });
    }
    // Startup in a second (give the x-server time to start).
    setTimeout(startup, 1000);
  }
}

module.exports = browser;
