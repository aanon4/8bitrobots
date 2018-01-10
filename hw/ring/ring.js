'use strict';

console.info('Loading RingNet.');

const SerialPort = require('serialport');
const EventEmitter = require('events').EventEmitter;
const util = require('util');


const STATE =
{
  SYNC: 0,
  DST: 1,
  SRC: 2,
  PROTOCOL: 3,
  CRC: 4,
  DATA: 5,
  ESCDATA: 6,
  SRCFORWARD: 7,
  DATAFORWARD: 8
};

const PKT =
{
  SYNC: 0xF5,
  ESC: 0xF6
};

const ADDRESS =
{
  NULL:   0x00,
  MASTER: 0x01,
  FIRST:  0x02,
  LAST:   0xF4,
  NEXT:   0xFF
};

const COMMAND =
{
  RESET:          0x01,
  RESET_CONFIRM:  0x02,
  RESOLVE:        0x03,
  RESOLVED:       0x04,
  LIST:           0x05,
  SET_ADDRESS:    0x06,
  ACK:            0x10,
  NACK:           0x11,
  NETWORK_CHANGE: 0x12,
  DEBUG:          0x20,
  DEBUG_ENABLE:   0x21,
};

const PROTOCOL =
{
  LEVEL_BIT:  0x10,
  SYSTEM:     0x00,
  USER:       0x10,
  ACK_BIT:    0x40
};

const ERROR =
{
  OK: 0,
  ACK: 1,
  NACK: 2,
  CRC: 3,
  TOOBIG: 4,
  REMOVE: 5,
  REMOVED: 6,
  EMPTY: 7,
  BUSY: 8,
  SPACE: 9,
  BADDATA: 10,
  INITIALIZING: 11,
  ADDRESS: 12,
  PROTOCOL: 13,
  PENDING: 14
};

const FLAG =
{
  DEBUG_ENABLED: 0x01,
  IN_RESET: 0x02,
};

const crcTable =
[
  0x00, 0x07, 0x0e, 0x09, 0x1c, 0x1b, 0x12, 0x15, 0x38, 0x3f, 0x36, 0x31,
  0x24, 0x23, 0x2a, 0x2d, 0x70, 0x77, 0x7e, 0x79, 0x6c, 0x6b, 0x62, 0x65,
  0x48, 0x4f, 0x46, 0x41, 0x54, 0x53, 0x5a, 0x5d, 0xe0, 0xe7, 0xee, 0xe9,
  0xfc, 0xfb, 0xf2, 0xf5, 0xd8, 0xdf, 0xd6, 0xd1, 0xc4, 0xc3, 0xca, 0xcd,
  0x90, 0x97, 0x9e, 0x99, 0x8c, 0x8b, 0x82, 0x85, 0xa8, 0xaf, 0xa6, 0xa1,
  0xb4, 0xb3, 0xba, 0xbd, 0xc7, 0xc0, 0xc9, 0xce, 0xdb, 0xdc, 0xd5, 0xd2,
  0xff, 0xf8, 0xf1, 0xf6, 0xe3, 0xe4, 0xed, 0xea, 0xb7, 0xb0, 0xb9, 0xbe,
  0xab, 0xac, 0xa5, 0xa2, 0x8f, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9d, 0x9a,
  0x27, 0x20, 0x29, 0x2e, 0x3b, 0x3c, 0x35, 0x32, 0x1f, 0x18, 0x11, 0x16,
  0x03, 0x04, 0x0d, 0x0a, 0x57, 0x50, 0x59, 0x5e, 0x4b, 0x4c, 0x45, 0x42,
  0x6f, 0x68, 0x61, 0x66, 0x73, 0x74, 0x7d, 0x7a, 0x89, 0x8e, 0x87, 0x80,
  0x95, 0x92, 0x9b, 0x9c, 0xb1, 0xb6, 0xbf, 0xb8, 0xad, 0xaa, 0xa3, 0xa4,
  0xf9, 0xfe, 0xf7, 0xf0, 0xe5, 0xe2, 0xeb, 0xec, 0xc1, 0xc6, 0xcf, 0xc8,
  0xdd, 0xda, 0xd3, 0xd4, 0x69, 0x6e, 0x67, 0x60, 0x75, 0x72, 0x7b, 0x7c,
  0x51, 0x56, 0x5f, 0x58, 0x4d, 0x4a, 0x43, 0x44, 0x19, 0x1e, 0x17, 0x10,
  0x05, 0x02, 0x0b, 0x0c, 0x21, 0x26, 0x2f, 0x28, 0x3d, 0x3a, 0x33, 0x34,
  0x4e, 0x49, 0x40, 0x47, 0x52, 0x55, 0x5c, 0x5b, 0x76, 0x71, 0x78, 0x7f,
  0x6a, 0x6d, 0x64, 0x63, 0x3e, 0x39, 0x30, 0x37, 0x22, 0x25, 0x2c, 0x2b,
  0x06, 0x01, 0x08, 0x0f, 0x1a, 0x1d, 0x14, 0x13, 0xae, 0xa9, 0xa0, 0xa7,
  0xb2, 0xb5, 0xbc, 0xbb, 0x96, 0x91, 0x98, 0x9f, 0x8a, 0x8d, 0x84, 0x83,
  0xde, 0xd9, 0xd0, 0xd7, 0xc2, 0xc5, 0xcc, 0xcb, 0xe6, 0xe1, 0xe8, 0xef,
  0xfa, 0xfd, 0xf4, 0xf3
];

const NET_TIMEOUT = 1000;
const KEEPALIVE_TIMER = 1000;
const MAX_DATA = 16;

function ring(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  this._isMaster = config.master;

  this._uart = new SerialPort(config.uart.port,
  {
    baudRate: 500000
  });

  this._nrNodes = 0;
  this._loopTime = 0;
  this._resetStartTime = 0;
  this._flags = 0;
  this._buffer = Buffer.alloc(MAX_DATA);
  this._bufferPos = 0;
  this._localAddress = ADDRESS.NULL;
  this._eraseAddress = ADDRESS.NULL;
  this._remoteAddress = ADDRESS.NULL;
  this._forwardAddress = ADDRESS.NULL;
  this._localLongAddress = [ 0, 0, 0, 0, 0, 0, 0, 0 ];
  this._remoteProtocol = PROTOCOL.SYSTEM;
  this._writeQ = [];
  this._pendingQ = [];
  this._keepaliveTimer = null;
  this._lastTime = Date.now();

  this._incomingUart = this._incomingUart.bind(this);
  this._keepalive = this._keepalive.bind(this);
}

ring.prototype =
{
  enable: function()
  {
    this._this._state = STATE.SYNC;
    this._uart.on('data', _incomingUart);
    if (this._isMaster)
    {
      this.reset(() => {
        this._keepaliveTimer = setInterval(this._keepalive, KEEPALIVE_TIMER);
      });
    }
    else
    {
      this._keepaliveTimer = setInterval(this._keepalive, KEEPALIVE_TIMER);
    }
    return this;
  },
  
  disable: function()
  {
    clearInterval(this._keepaliveTimer);
    this._keepaliveTimer = null;
    this._uart.removeListener('data', _incomingUart);
    return this;
  },

  send: function(remoteAddress, buffer, ack)
  {
    if (remoteAddress == ADDRESS.NULL)
    {
      throw new Error('No address');
    }
    this._sendInternal(this._localAddress, remoteAddress, PROTOCOL.USER, buffer, ack);
  },

  reset: function(complete)
  {
    this._nrNodes = 0;
    const resetComplete = () => {
      this.removeListener('resetComplete', resetComplete);
      complete && complete();
      this._ready();
    }
    this.addListener('resetComplete', resetComplete);
    this._flags |= FLAGS.IN_RESET;
    this._localAddress = ADDRESS.MASTER;
    this._resetStartTime = Date.now();
    this._sendInternal(this._localAddress, ADDRESS.NEXT, PROTOCOL.SYSTEM, Buffer.from([ COMMAND.RESET, ADDRESS.FIRST ]), false);
  },

  setAddress: function(address)
  {
    this._localLongAddress =
    [
      address[0], address[1], address[2], address[3], address[4], address[5], address[6], address[7]
    ];
    if ((address[0] | address[1] | address[2] | address[3] | address[4] | address[5] | address[6]) === 0 && address[7] === 1)
    {
      this._localAddress = ADDRESS.MASTER;
    }
  },

  resolve: function(longAddress)
  {
    if (this._localAddress == ADDRESS.MASTER)
    {
      this.emit('resolved', this._localAddress, this._localLongAddress);
    }
    else
    {
      this._sendInternal(this._localAddress, ADDRESS.NEXT, PROTOCOL.SYSTEM, Buffer.from([ COMMAND.RESOLVE, longAddress[0], longAddress[1], longAddress[2], longAddress[3], longAddress[4], longAddress[5], longAddress[6], longAddress[7] ]), false);
    }
  },

  list: function()
  {
    this._sendInternal(this._localAddress, ADDRESS.NEXT, PROTOCOL.SYSTEM, Buffer.from([ COMMAND.LIST ]), false);
  },

  networkChange: function()
  {
    if (this._localAddress == ADDRESS.MASTER)
    {
      this.emit('networkChange', this._localAddress);
    }
    else
    {
      this._sendInternal(this._localAddress, ADDRESS.MASTER, PROTOCOL.SYSTEM, Buffer.from([ COMMAND.NETWORK_CHANGE ]), false);
    }
  },

  enableDebug: function(remoteAddress, enable)
  {
    if (remoteAddress == ADDRESS.MASTER)
    {
      this._flags = (this._flags & ~FLAG.DEBUG_ENABLED) | (enable ? FLAG.DEBUG_ENABLED : 0);
    }
    else
    {
      this._sendInternal(this._localAddress, remoteAddress, PROTOCOL.SYSTEM, Buffer.from([ COMMAND.DEBUG_ENABLE, enable ]), false);
    }
  },

  _incomingUart: function(buffer)
  {
    for (let i = 0; i < buffer.length; i++)
    {
      let data = buffer[i];
      switch (this._state)
      {
        case STATE.SYNC:
          if (data == PKT.SYNC)
          {
            this._ready();
            this._state = STATE.DST;
            this._writeByte(PKT.SYNC);
          }
          else
          {
            // Don't pass on data when we're out-of-sync
          }
          break;
        case STATE.DST:
          if (data == PKT.SYNC)
          {
            // We just forwarded a sync, so we don't forward this one and wait for the src again
          }
          else if (data == this._localAddress)
          {
            // Packet for us
            this._state = STATE.SRC;
            this._forwardAddress = this._localAddress;
          }
          else if (data == ADDRESS.NEXT)
          {
            // Next address - always for us
            this._state = STATE.SRC;
            this._forwardAddress = ADDRESS.NEXT;
          }
          else if (data == this._eraseAddress || (this._localAddress == ADDRESS.MASTER && (data < ADDRESS.MASTER || data > ADDRESS.FIRST + nrNodes)))
          {
            // Packet destination is invalid so should be removed - don't forward it
            this._state = STATE.SYNC;
            this._error(ERROR.REMOVED);
            this._eraseAddress = ADDRESS.NULL;
            this._ready();
            this._writeByte(PKT.SYNC);
          }
          else
          {
            // Not for us - forward
            this._forwardAddress = data;
            this._state = STATE.SRCFORWARD;
            this._writeByte(data);
          }
          break;
        case STATE.SRC:
          if (data == PKT.SYNC)
          {
            // Discard pkt so far and resync
            this._state = STATE.SYNC;
            this._ready();
            this._state = STATE.DST;
            this._writeByte(PKT.SYNC);
          }
          else
          {
            this._state = STATE.PROTOCOL;
            this._remoteAddress = data;
          }
          break;
        case STATE.PROTOCOL:
          this._state = STATE.DATA;
          this._bufferPos = 0;
          this._remoteProtocol = data;
          break;
        case STATE.DATA:
          if (data == PKT.SYNC)
          {
            // End of packet
            this._state = STATE.SYNC;
            // Packet needs at least 2 bytes (data + crc)
            if (this._bufferPos >= 2)
            {
              // Check crc
              let crc = crcTable[(crcTable[(crcTable[this._forwardAddress]) ^ this._remoteAddress]) ^ this._remoteProtocol];
              this._bufferPos--;
              for (let i = 0; i < this._bufferPos; i++)
              {
                crc = crcTable[crc ^ this._buffer[i]];
              }
              if (crc != this._buffer[this._bufferPos])
              {
                // CRC failed - error
                // Send nacks for all direct messages
                if ((this._remoteProtocol & PROTOCOL.ACK_BIT) != 0)
                {
                  this._sendInternal(this._remoteAddress, this._localAddress, PROTOCOL.SYSTEM, Buffer.from([ COMMAND.NACK ]), false);
                }
                this._error(ERROR.CRC);
              }
              else
              {
                // Packet okay - deliver
                this._recv(this._remoteAddress, this._remoteProtocol, Buffer.from(this._buffer, 0, this._bufferPos));
              }
            }
            else
            {
              // Empty packet - error
              this._error(ERROR.EMPTY);
            }
            this._ready();
            this._state = STATE.DST;
            this._writeByte(PKT.SYNC);
          }
          else
          {
            if (this._bufferPos >= MAX_DATA)
            {
              // Too big - discard data and write a sync so upstream
              // will know the packet has ended (but crc will fail)
              this._error(ERROR.TOOBIG);
              this._state = STATE.SYNC;
              this._ready();
            }
            else
            {
              if (data == PKT.ESC)
              {
                this._state = STATE.ESCDATA;
              }
              else
              {
                this._buffer[this._bufferPos++] = data;
              }
            }
          }
          break;
        case STATE.ESCDATA:
          if (data > 0x7F)
          {
            this._state = STATE.SYNC;
            this._error(ERROR.BADDATA);
            this._ready();
            // If data looks like a new sync, treat it as a new sync
            if (data == PKT.SYNC)
            {
              this._state = STATE.DST;
            }
            this._writeByte(PKT.SYNC);
          }
          else
          {
            this._state = STATE.DATA;
            this._buffer[this._bufferPos++] = 0x80 | data;
          }
          break;

        case STATE.SRCFORWARD:
          if (data == PKT.SYNC)
          {
            this._state = STATE.SYNC;
            this._ready();
            this._state = STATE.DST;
            this._writeByte(PKT.SYNC);
          }
          else if (data == this._localAddress)
          {
            // Packet was sent by us but not consumed by anyone
            // This junk will just keep flowing round the network. To remove it we watch
            // for it to come round next time and take it off the network.
            this._eraseAddress = this._forwardAddress;
            this._pending.length = 0;
            this._state = STATE.SYNC;
            this._error(ERROR.REMOVE);
            this._writeByte(PKT.SYNC);
          }
          else
          {
            this._state = STATE.DATAFORWARD;
            this._writeByte(data);
          }
          break;

        case STATE.DATAFORWARD:
          if (data == PKT.SYNC)
          {
            this._state = STATE.SYNC;
            this._ready();
            this._state = STATE.DST;
          }
          this._writeByte(data);
          break;
        
        default:
          break;
      }
    }
    this._lastTime = Date.now();
  },

  _recv: function(remoteAddress, remoteProtocol, buffer)
  {
    switch (remoteProtocol)
    {
      case PROTOCOL.SYSTEM:
        switch (buffer.readUInt8(0))
        {
          case COMMAND.RESET:
            // If command was send from here, this is it returning home. Dont forward.
            if (remoteAddress == this._localAddress)
            {
              // Reset complete - now confirm
              this._loopTime = 2 * (Date.now() - this._resetStartTime);
              this._nrNodes = buffer.readUInt8(1) - ADDRESS.FIRST;
              this._sendInternal(this._localAddress, ADDRESS.NEXT, PROTOCOL.SYSTEM, Buffer.from([ COMMAND.RESET_CONFIRM, this._nrNodes, (this._loopTime >> 8) & 0xFF, this._loopTime & 0xFF ]), false);
            }
            else
            {
              this._localAddress = buffer.readUInt8(1);
              buffer.writeUInt8(this._localAddress + 1, 1);
              this._sendInternal(remoteAddress, ADDRESS.NEXT, this._remoteProtocol, buffer, false);
            }
            break;

          case COMMAND.RESET_CONFIRM:
            if (remoteAddress == localAddress)
            {
              this.flags = this.flags & ~FLAG.IN_RESET;
              this.event('resetComplete');
            }
            else
            {
              this._nrNodes = buffer[1];
              this._loopTime = buffer.readUInt16BE(2);
              this._sendInternal(remoteAddress, ADDRESS.NEXT, this._remoteProtocol, buffer, false);
            }
            break;

            case COMMAND.RESOLVE:
            if (remoteAddress == this._localAddress)
            {
              // Unresolved
              this.emit('resolved', ADDRESS.NULL, buffer.slice(1));
            }
            else if (len == 9)
            {
              if (this._localLongAddress.toString() === buffer.slice(1).toJSON().data.toString())
              {
                // My address - resolved
                buffer[0] = COMMAND_RESOLVED;
                this._sendInternal(this._localAddress, remoteAddress, remoteProtocol, buffer, false);
              }
              else
              {
                this._sendInternal(remoteAddress, ADDRESS_NEXT, remoteProtocol, buffer, false);
              }
            }
            break;
  
          case COMMAND.RESOLVED:
            this.emit('resolved', remoteAddress, buffer.slice(1));
            break;
  
          case COMMAND.LIST:
            if (remoteAddress != this._localAddress)
            {
              this._sendInternal(remoteAddress, ADDRESS.NEXT, remoteProtocol, buffer, len, false);
              this._sendInternal(this._localAddress, remoteAddress, PROTOCOL.SYSTEM, Buffer.from(COMMAND.RESOLVED, localLongAddress[0], localLongAddress[1], localLongAddress[2], localLongAddress[3], localLongAddress[4], localLongAddress[5], localLongAddress[6], localLongAddress[7]), false);
            }
            break;
  
          case COMMAND.SET_ADDRESS:
            if (len == 9)
            {
              this.emit('setAddress', buffer.slice(1));
            }
            break;

          case COMMAND.DEBUG_ENABLE:
            if (buffer.length == 2)
            {
              this._flags = (this._flags & ~FLAG.DEBUG_ENABLED) | (buffer[1] ? FLAG.DEBUG_ENABLED : 0);
            }
            break;

          case COMMAND.NETWORK_CHANGE:
            this.emit('networkChange', remoteAddress);
            break;

          case COMMAND.DEBUG:
            // Debug commands are dispatched in the usual way to the master only.
            if (this._localAddress == ADDRESS_MASTER)
            {
              this.emit('debug', buffer.slice(1), remoteAddress);
            }
            break;

          case COMMAND.ACK:
            for (let i = 0; i < this._pendingQ.length; i++)
            {
              if (this._pendingQ[i].msg.readUInt8(1) == remoteAddress)
              {
                this._pendingQ.splice(i, 1);
                break;
              }
            }
            this.emit('ack', remoteAddress);
            break;

          case COMMAND.NACK:
            for (let i = 0; i < this._pendingQ.length; i++)
            {
              if (this._pendingQ[i].msg.readUInt8(1) == remoteAddress)
              {
                let pending = this._pendingQ.splice(i, 1)[0];
                this._queueToSend(pending.msg, pending.ack, pending.system);
                break;
              }
            }
            break;

          default:
            // Forward command, even if we don't understand it
            this._sendInternal(remoteAddress, ADDRESS.NEXT, this._remoteProtocol, buffer, false);
            break;
        }
        break;

      case PROTOCOL.USER:
        // Send acks as necessary
        if ((remoteProtocol & PROTOCOL.ACK_BIT) != 0)
        {
          this._sendInternal(this._localAddress, remoteAddress, PROTOCOL.SYSTEM, Buffer.from([ COMMAND.ACK ]), false);
        }
        this.emit('data', buffer, remoteAddress);
        break;

      default:
        break;
    }
  },

  _sendInternal: function(localAddress, remoteAddress, protocol, buffer, ack)
  {
    if (localAddress == ADDRESS.NULL)
    {
      throw new Error('Not initialized');
    }
    if (buffer.length > MAX_DATA)
    {
      throw new Error('Data too big');
    }
  
    let extra = 0;
    let crc = crcTable[(crcTable[(crcTable[remoteAddress]) ^ localAddress]) ^ protocol]
    for (let i = 0; i < buffer.length; i++)
    {
      const v = buffer[i];
      crc = crcTable[crc ^ v];
      if (v === PKT.SYNC || v === PKT.ESC)
      {
        extra++;
      }
    }
    if (crc === PKT.SYNC || crc === PKT.ESC)
    {
      extra++;
    }
    let send = Buffer.alloc(5 + buffer.length + extra);

    let pos = 0;
    send.writeUInt8(PKT.SYNC, pos++);
    send.writeUInt8(remoteAddress, pos++);
    send.writeUInt8(localAddress, pos++);
    send.writeUInt8(protocol | (ack ? PROTOCOL.ACK_BIT : 0), pos++);
    for (let i = 0; i < buffer.length; i++)
    {
      const v = buffer[i];
      if (v === PKT.SYNC || v === PKT.ESC)
      {
        send.writeUInt8(PKT.ESC, pos++);
        send.writeUInt8(v & 0x7F, pos++);
      }
      else
      {
        send.writeUInt8(v, pos++);
      }
    }
    if (crc === PKT.SYNC || crc === PKT.ESC)
    {
      send.writeUInt8(PKT.ESC, pos++);
      send.writeUInt8(crc & 0x7F, pos++);
    }
    else
    {
      send.writeUInt8(crc, pos++);
    }
    send.writeUInt8(PKT.SYNC, pos++);

    this._queueToSend(send, ack, protocol !== PROTOCOL.USER);
  },

  _queueToSend: function(msg, ack, system)
  {
    if ((!system && this._nrNodes == 0) || this._state > STATE.DST)
    {
      this._writeQ.push(
        {
          ack: ack,
          system: system,
          msg: msg
        });
    }
    else
    {
      if (ack)
      {
        this._pendingQ.push(
        {
          time: Date.now(),
          ack: true,
          system: system,
          msg: msg
        });
      }
      this._uart.write(msg);
    }
  },

  _ready: function()
  {
    const now = Date.now();
    const pendingQ = this._pendingQ;
    this._pendingQ = [];
    pendingQ.forEach((pending) => {
      if (now - pending.time > this._loopTime)
      {
        this._queueToSend(pending.msg, pending.ack, pending.system);
      }
      else
      {
        this._pendingQ.push(pending);
      }
    });
    for (let pending; (pending = this._writeQ.unshift()); )
    {
      this._queueToSend(pending.msg, pending.ack, pending.system);
    }
  },

  _keepalive: function()
  {
    const now = Date.now();
    if (now - this._lastTime > NET_TIMEOUT)
    {
      this._state = STATE_SYNC;
      this._writeByte(PKT.SYNC);
      this._lastTime = now;
    }
  },

  _error: function(code)
  {
    this.emit('error', code);
  },

  _writeByte: function(value)
  {
    this._uart.write([ value ]);
  }
}

util.inherits(ring, EventEmitter);

module.exports = ring;
