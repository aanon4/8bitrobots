'use strict';

console.info('Loading Browser.');

const childProcess = require('child_process');
const ConfigManager = require('modules/config-manager');

const CMD_XSERVER = '/usr/bin/X';
const CMD_SLEEP = '/bin/sleep';
const CMD_BROWSER = '/usr/bin/chromium';


function browser(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._config = new ConfigManager(this,
  {
    startup: config.startup || 'about:blank'
  });
}

browser.prototype =
{
  enable: function()
  {
    this._config.enable();
    this._startup = this._config.get('startup');

    const options =
    {
      env:
      {
        DISPLAY: ':0.0'
      },
      stdio: [ 'ignore', 'ignore', 'ignore' ]
    };

    // Startup the X-server
    this._xserver = childProcess.spawn(CMD_XSERVER,
    [
      '-dpms', '-ac', '-wr', '-nocursor', '-s', '0', '-v'
    ], options);

    
    // Hacky way to sleep for a moment to let the server startup
    childProcess.spawnSync(CMD_SLEEP, [ '1' ], options);

    // Start the browser
    this._browser = childProcess.spawn(CMD_BROWSER,
    [
      '--no-first-run',
      '--no-sandbox',
      '--noerrordialogs',
      '--window-size=1920,1280',
      `--app=${this._startup}`
    ], options);

    return this;
  },
  
  disable: function()
  {
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
  }
}

module.exports = browser;
