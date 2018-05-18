'use strict';

console.info('Loading Networking.');

const fs = require('fs');                     
const childProcess = require('child_process');
const StateManager = require('./state-manager');

const CMD_HOSTAPD = '/etc/init.d/hostapd';
const CMD_HOSTNAME = '/bin/hostname';
const CMD_IFUP = '/sbin/ifup';
const CMD_IFDOWN = '/sbin/ifdown';
const CMD_SOFTAP = '/etc/init.d/softap';

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
const NET_INTERFACES_CONFIG = '/etc/network/interfaces';
let HOSTAPD_CONFIG = null;
let WPA_SUPPLICANT_CONFIG = null;

const SERVICE_CONFIG = { service: 'config', schema: 
{
  networkName: 'String',
  networkPassword: 'String',
  apNetworkName: 'String',
  apNetworkPassword: 'String',
  apNetworkAddress: 'String'
}};

function networking(config)
{
  this._name = config.name;
  this._node = Node.init(config.name);
  this._enabled = 0;

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

  if ('networkName' in config && 'networkPassword' in config)
  {
    this._preset =
    {
      networkName: config.networkName,
      networkPassword: config.networkPassword
    };
  }
  this._state = new StateManager({ name: `config-${this._name.replace(/\//g, '_')}` });
}

networking.prototype =
{
  enable: function()
  {
    if (this._enabled++ === 0)
    {
      this._node.service(SERVICE_CONFIG, (request) => {
        if ('networkName' in request || 'networkPassword' in request)
        {
          this._state.set('networkUpdated', true);
        }
        return this._updateNetwork(request);
      });
      if (this._preset && this._state.get('networkUpdated') !== true)
      {
        this._updateNetwork(this._preset);
      }
    }
    return this;
  },
  
  disable: function()
  {
    if (--this._enabled === 0)
    {
      this._node.unservice(SERVICE_CONFIG);
    }
    return this;
  },

  _updateNetwork: function(request)
  {
    let hostap = [];
    let wpa = [];
    let net = [];
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
    try
    {
      net = fs.readFileSync(NET_INTERFACES_CONFIG, { encoding: 'utf8' }).split('\n');
    }
    catch (_)
    {
    }

    function findHostApIndex(key)
    {
      for (let i = 0; i < hostap.length; i++)
      {
        if (hostap[i].trim().indexOf(key) === 0)
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
        if (wpa[i].trim().indexOf(key) === 0)
        {
          return i;
        }
      }
      return -1;
    }
    function findNetIndex(key)
    {
      for (let i = 0; i < net.length; i++)
      {
        if (net[i].trim().indexOf(key) === 0)
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
    let netChange = false;
    
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
    idx = findNetIndex('address');
    if (idx !== -1)
    {
      if ('apNetworkAddress' in request)
      {
        const root = request.apNetworkAddress.split('.').slice(0, 3).join('.');
        net[idx + 0] = ` address ${request.apNetworkAddress}`;
        net[idx + 1] = ` netmask 255.255.255.0`;
        net[idx + 2] = ` network ${root}.0`;
        net[idx + 3] = ` broadcast ${root}.255`;
        netChange = true;
      }
      else
      {
        result.apNetworkAddress = net[idx].trim().split(' ')[1];
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
    if (netChange)
    {
      fs.writeFileSync(NET_INTERFACES_CONFIG, net.join('\n'), { encoding: 'utf8' });
      childProcess.spawn(CMD_SOFTAP, [ 'restart' ], {});
    }

    return result;
  }
}

module.exports = networking;
