'use strict';

console.info('Loading Networking.');

const fs = require('fs');                     
const childProcess = require('child_process');

const CMD_HOSTAPD = '/etc/init.d/hostapd';
const CMD_HOSTNAME = '/bin/hostname';
const CMD_IFUP = '/sbin/ifup';
const CMD_IFDOWN = '/sbin/ifdown';

const HOSTAPD_CONFIGS =
[
  '/etc/hostapd.conf',
  '/etc/hostapd/hostapd.conf'
]
const WPA_SUPPLICANT_CONFIGS =
[
  '/etc/wpa_supplicant.conf',
  '/etc/wpa_supplicant/wpa_supplicant.conf'
];
let HOSTAPD_CONFIG = null;
let WPA_SUPPLICANT_CONFIG = null;

const SERVICE_CONFIG = { service: 'config', schema: 
{
  networkName: 'String',
  networkPassword: 'String',
  apNetworkName: 'String',
  apNetworkPassword: 'String'
}};

function networking(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);

  WPA_SUPPLICANT_CONFIGS.forEach((file) => {
    if (fs.existsSync(file))
    {
      WPA_SUPPLICANT_CONFIG = file;
    }
  });
  HOSTAPD_CONFIGS.forEach((file) => {
    if (fs.existsSync(file))
    {
      HOSTAPD_CONFIG = file;
    }
  });
}

networking.prototype =
{
  enable: function()
  {
    this._node.service(SERVICE_CONFIG, (request) => {

      let hostap = [];
      let wpa = [];
      try
      {
        hostap = fs.readFileSync(HOSTAPD_CONFIG, { encoding: 'utf8' }).split('\n');
      }
      catch (_)
      {
      }
      try
      {
        wpa = fs.readFileSync(WPA_SUPPLICANT_CONFIG, { encoding: 'utf8' }).split('\n');
      }
      catch (_)
      {
      }

      function findHostApIndex(key)
      {
        for (let i = 0; i < hostap.length; i++)
        {
          if (hostap[i].indexOf(key) !== -1)
          {
            return i;
          }
        }
        return -1;
      }
      function findWpaIndex(key)
      {
        for (let i = 0; i < wpa.length; i++)
        {
          if (wpa[i].indexOf(key) !== -1)
          {
            return i;
          }
        }
        return -1;
      }

      let result = {};
      let idx;
      let hostapChange = false;
      let wpaChange = false;
      
      idx = findHostApIndex('ssid=');
      if (idx !== -1)
      {
        if ('apNetworkName' in request)
        {
          hostap[idx] = `ssid=${request.apNetworkName}`;
          result.apNetworkName = request.apNetworkName;
          hostapChange = true;
        }
        else
        {
          result.apNetworkName = hostap[idx].split('=')[1];
        }
      }
      idx = findHostApIndex('wpa_passphrase=');
      if (idx !== -1)
      {
        if ('apNetworkPassword' in request)
        {
          hostap[idx] = `wpa_passphrase=${request.apNetworkPassword}`;
          result.apNetworkPassword = request.apNetworkPassword;
          hostapChange = true;
        }
        else
        {
          result.apNetworkPassword = hostap[idx].split('=')[1];
        }
        result.apNetworkPassword = result.apNetworkPassword.replace(/./g, '*');
      }
      idx = findWpaIndex('ssid=');
      if (idx !== -1)
      {
        if ('networkName' in request)
        {
          wpa[idx] = `ssid=${request.networkName}`;
          result.networkName = request.networkName;
          wpaChange = true;
        }
        else
        {
          result.networkName = wpa[idx].split('=')[1];
        }
      }
      idx = findWpaIndex('psk=');
      if (idx !== -1)
      {
        if ('networkPassword' in request)
        {
          wpa[idx] = `psk=${request.networkPassword}`;
          result.networkPassword = request.networkPassword;
          wpaChange = true;
        }
        else
        {
          result.networkPassword = wpa[idx].split('=')[1];
        }
        result.networkPassword = result.networkPassword.replace(/./g, '*');
      }

      if (hostapChange)
      {
        fs.writeFileSync(HOSTAPD_CONFIG, hostap.join('\n'), { encoding: 'utf8' });
        childProcess.spawn(CMD_HOSTAPD, [ 'restart' ], {});
        childProcess.spawn(CMD_HOSTNAME, [ result.apNetworkName ], {});
      }
      if (wpaChange)
      {
        fs.writeFileSync(WPA_SUPPLICANT_CONFIG, wpa.join('\n'), { encoding: 'utf8' });
        childProcess.spawn(CMD_IFDOWN, [ 'wlan0' ], {});
        childProcess.spawn(CMD_IFUP, [ 'wlan0' ], {});
      }

      return result;
    });

    return this;
  },
  
  disable: function()
  {
    this._node.unservice(SERVICE_CONFIG);

    return this;
  }
}

module.exports = networking;
