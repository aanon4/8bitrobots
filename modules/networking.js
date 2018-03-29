'use strict';

console.info('Loading Networking.');

const fs = require('fs');                     
const childProcess = require('child_process');

const CMD_HOSTAPD = '/etc/init.d/hostapd';
const CMD_HOSTNAME = '/bin/hostname';
const CMD_IFUP = '/sbin/ifup';
const CMD_IFDOWN = '/sbin/ifdown';

const HOSTAPD_CONFIG = '/etc/hostapd.conf';
const WPA_SUPPLICANT_CONFIG = '/etc/wpa_supplicant.conf';

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
}

networking.prototype =
{
  enable: function()
  {
    this._node.service(SERVICE_CONFIG, (request) => {

      const hostap = fs.readFileSync(HOSTAPD_CONFIG, { encoding: 'utf8' }).split('\n');
      const wpa = fs.readFileSync(WPA_SUPPLICANT_CONFIG, { encoding: 'utf8' }).split('\n');

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
