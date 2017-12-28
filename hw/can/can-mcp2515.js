console.info('Loading MCP2515 CAN controllers.');

const Deasync = require('deasync');

const MCP =
{
  WRITE:     0x02,
  READ:      0x03,
  BITMODIFY: 0x05,
  TXBUF:     0x40,
  RTS:       0x80,
  RXBUF:     0x90,
  STATUS:    0xA0,
  RXSTATUS:  0xB0,
  RESET:     0xC0,

  SIDH:      0x00,
  SIDL:      0x01,
  EID8:      0x02,
  EID0:      0x03,

  RTR_MASK:  0x40,

  CANCTRL:   0x0F,

  RXF0SIDH:  0x00,
  RXF1SIDH:  0x04,
  RXF2SIDH:  0x08,
  BFPCTRL:   0x0C,
  TXRTSCTRL: 0x0D,
  RXF3SIDH:  0x10,
  RXF4SIDH:  0x14,
  RXF5SIDH:  0x18,
  RXM0SIDH:  0x20,
  RXM1SIDH:  0x24,
  CNF3:      0x28,
  CNF2:      0x29,
  CNF1:      0x2A,
  CANINTE:   0x2B,
  CANINTF:   0x2C,

  TXB0CTRL:  0x30,
  TXB1CTRL:  0x40,
  TXB2CTRL:  0x50,
  RXB0CTRL:  0x60,
  RXB1CTRL:  0x70,

  TXB_TXREQ_M: 0x08,

  TXB_EXIDE_M: 0x08,

  CTRL_MODE_MASK:   0xE0,
  CTRL_MODE_NORMAL: 0x00,
  CTRL_MODE_CONFIG: 0x40,

  STAT_RX0IF: 0x01,
  STAT_RX1IF: 0x02,

  INT_RX0IE: 0x01,
  INT_RX1IE: 0x02,
  INT_TX0IE: 0x04,
  INT_TX1IE: 0x08,
  INT_TX2IE: 0x10,

  INT_RX0IF: 0x01,
  INT_RX1IF: 0x02,
  INT_TX0IF: 0x04,
  INT_TX1IF: 0x08,
  INT_TX2IF: 0x10,

  RXB_RX_ALL:    0x60,
  RXB_RX_STDEXT: 0x00,
  RXB_RX_MASK:   0x60,
  RXB_BUKT_MASK: 0x04,
};

function can(config)
{
  this._spi = config.spi;
  this._listeners = {};

  let done = false;

  this._setMode(MCP.CTRL_MODE_CONFIG).then(() => {
    return this._setSpeed(config.speed);
  }).then(() => {
    return this._initBuffers();
  }).then(() => {
    return this._initInterrupts(config.interrupt);
  }).then(() => {
    return this._initGPIO();
  }).then(() => {
    return this._initRecvMode(true);
  }).then(() => {
    return this._setMode(MCP.CTRL_MODE_NORMAL);
  }).then(() => {
    done = true;
  });

  Deasync.loopWhile(() =>
  {
    return !done;
  });
}

can.prototype =
{
  sendMsg: function(id, msg, rtr)
  {
    if (msg.length > 8)
    {
      throw new Error('Msg too long');
    }
    return this._getNextTxBuffer().then((txbuf) => {
      return rtr ? true : this._writeRegisters(txbuf + 6, msg);
    }).then(() => {
      return this._writeRegister(txbuf + 5, msg.length + (rtr ? MCP.RTR_MASK : 0));
    }).then(() => {
      return this._writeId(txbuf + 1, id);
    }).then(() => {
      return this._modifyRegister(txbuf + 0, MCP.TXB_TXREQ_M, MCP.TXB_TXREQ_M);
    });
  },

  recvMsg: function()
  {
    return this._readStatus().then((status) => {
      if ((status & MCP.STAT_RX0IF) !== 0)
      {
        return this._readMsg(MCP.RXB0CTRL).then((msg) => {
          return this._modifyRegister(MCP.CANINTF, MCP.INT_RX0IF, 0).then(() => {
            return msg;
          });
        });
      }
      else if ((status & MCP.STAT_RX1IF) !== 0)
      {
        return this._readMsg(MCP.RXB1CTRL).then((msg) => {
          return this._modifyRegister(MCP.CANINTF, MCP.INT_RX1IF, 0).then(() => {
            return msg;
          });
        });
      }
      else
      {
        return null;
      }
    });
  },

  addListener: function(id, callback)
  {
    const key = `${id.id}/${id.ext}`;
    const listeners = this._listeners[key] || (this._listeners[key] = []);
    listeners.push(callback);
  },

  removeListener: function(id, callback)
  {
    const key = `${id.id}/${id.ext}`;
    const listeners = this._listeners[key];
    if (listeners)
    {
      const idx = listeners.indexOf(callback);
      if (idx !== -1)
      {
        listeners.splice(idx, 1);
      }
    }
  },

  setMaskAndFilters: function(nr, mask, filters)
  {
    filters = filters || [];
    return this._setMode(MCP.CTRL_MODE_CONFIG).then(() => {
      return this._writeMasksAndFilters(nr === 0 ? MCP.RXM0SIDH : MCP.RXM1SIDH, mask);
    }).then(() => {
      if (nr === 0)
      {
        if (filters.length < 1)
        {
          return true;
        }
        return this._writeMasksAndFilters(MCP.RXF0SIDH, filters[0]).then(() => {
          if (filters.length < 2)
          {
            return true;
          }
          return this._writeMasksAndFilters(MCP.RXF1SIDH, filters[1]);
        });
      }
      else
      {
        if (filters.length < 1)
        {
          return true;
        }
        return this._writeMasksAndFilters(MCP.RXF2SIDH, filters[0]).then(() => {
          if (filters.length < 2)
          {
            return true;
          }
          return this._writeMasksAndFilters(MCP.RXF3SIDH, filters[1]);
        }).then(() => {
          if (filters.length < 3)
          {
            return true;
          }
          return this._writeMasksAndFilters(MCP.RXF4SIDH, filters[2]);
        }).then(() => {
          if (filters.length < 4)
          {
            return true;
          }
          return this._writeMasksAndFilters(MCP.RXF5SIDH, filters[3]);
        });
      }
    }).then(() => {
      return this._setMode(MCP.CTRL_MODE_NORMAL);
    })
  },

  _readMsg: function(address)
  {
    let id = null;
    let ctrl = null;
    let len = null;
    let rtr = null;
    return this._readId(address + 1).then((_id) => {
      id = _id;
      return this._readRegister(address);
    }).then((_ctrl) => {
      rtr = (_ctrl & 0x08) ? true : false;
      return this._readRegister(address + 5);
    }).then((_len) => {
      let len = _len & 0x0F;
      return rtr ? null : this._readRegisters(address + 6, len);
    }).then((buffer) => {
      return {
        id: id,
        msg: buffer,
        len: len,
        rtr: rtr
      }
    });
  },

  _readRegister: function(address)
  {
    const tx = Buffer.from([ MCP.READ, address ]);
    const rx = Buffer.alloc(3);
    return this._spi.transfer(tx, rx).then((rx) => {
      return rx[2];
    });
  },

  _readRegisters: function(address, length)
  {
    const tx = Buffer.from([ MCP.READ, address ]);
    const rx = Buffer.alloc(length + 2);
    return this._spi.transfer(tx, rx).then(() => {
      return rx.slice(2);
    });
  },

  _readStatus: function()
  {
    const tx = Buffer.from([ MCP.STATUS ]);
    const rx = Buffer.alloc(2);
    return this._spi.transfer(tx, rx).then((rx) => {
      return rx[1];
    });
  },

  _readId: function(address)
  {
    let id = null;
    let ext = null;
    return this._readRegisters(address, 4).then((buffer) => {
      let sidl = buffer.readUInt8(MCP.SIDL);
      let sidh = buffer.readUIntU8(MCP.SIDH);
      let eid0 = buffer.readUInt8(MCP.EID0);
      let eid8 = buffer.readUInt8(MCP.EID8);
      if ((sidl & MCP.TXB_EXIDE_M) !== 0)
      {
        ext = true;
        id = eid0 + (eid8 << 8) + ((sidl & 0x03) << 16) + (sidh << 21) + ((sidl & 0xE0) << 13);
      }
      else
      {
        ext = false;
        id = (sidh << 3) + (sidl >> 5);
      }
      return {
        id: id,
        ext: ext
      };
    });
  },

  _writeRegister: function(address, value)
  {
    const tx = Buffer.alloc(3);
    tx.writeUInt8(MCP.WRITE, 0);
    tx.writeUInt8(address, 1);
    tx.writeUInt8(value, 2);
    return this._spi.write(tx);
  },

  _writeRegisters: function(address, buffer)
  {
    const tx = Buffer.alloc(buffer.length + 2);
    tx.writeUInt8(MCP.WRITE, 0);
    tx.writeUInt8(address, 1);
    buffer.copy(tx, 2, 0);
    return this._spi.write(tx);
  },

  _writeId: function(address, id)
  {
    const tx = Buffer.alloc(4);

    const lcanid = id.id & 0xFFFF;
    const hcanid = id.id >> 16;

    if (id.ext)
    {
      tx.writeUInt8(hcanid >> 5, MCP.SIDH);
      tx.writeUInt8(MCP.TXB_EXIDE_M + (hcanid & 3) + ((hcanid & 0x1C) << 3), MCP.SIDL);
      tx.writeUInt8(lcanid & 0xFF, MCP.EID0);
      tx.writeUInt8(lcanid >> 8, MCP.EID8);
    }
    else
    {
      tx.writeUInt8(lcanid >> 3, MCP.SIDH);
      tx.writeUInt8((lcanid & 7) << 5, MCP.SIDL);
      tx.writeUInt8(0, MCP.EID0);
      tx.writeUInt8(0, MCP.EID8);
    }
    return this._writeRegisters(address, tx);
  },

  _writeMasksAndFilters: function(address, id)
  {
    const tx = Buffer.alloc(4);
    
    const lcanid = id.id & 0xFFFF;
    const hcanid = id.id >> 16;

    if (id.ext)
    {
      tx.writeUInt8(hcanid >> 5, MCP.SIDH);
      tx.writeUInt8(MCP.TXB_EXIDE_M + (hcanid & 3) + ((hcanid & 0x1C) << 3), MCP.SIDL);
      tx.writeUInt8(lcanid & 0xFF, MCP.EID0);
      tx.writeUInt8(lcanid >> 8, MCP.EID8);
    }
    else
    {
      tx.writeUInt8(hcanid >> 3, MCP.SIDH);
      tx.writeUInt8((hcanid & 7) << 5, MCP.SIDL);
      tx.writeUInt8(lcanid & 0xFF, MCP.EID0);
      tx.writeUInt8(lcanid >> 8, MCP.EID8);
    }
    return this._writeRegisters(address, tx);
  },

  _modifyRegister: function(address, mask, value)
  {
    const tx = Buffer.alloc(4);
    tx.writeUInt8(MCP.BITMODIFY, 0);
    tx.writeUInt8(address, 1);
    tx.writeUInt8(mask, 2);
    tx.writeUInt8(value, 3);
    return this._spi.write(tx);
  },

  _setMode: function(mode)
  {
    return this._modifyRegister(MCP.CANCTRL, MCP.CTRL_MODE_MASK, mode).then(() => {
      return this._readRegister(MCP.CANCTRL);
    }).then((value) => {
      if (SIMULATOR)
      {
        value = mode;
      }
      if ((value & MCP.CTRL_MODE_MASK) != mode)
      {
        throw new Error('Failed to set mode');
      }
      return true;
    });
  },

  _setSpeed: function(speed)
  {
    let cfg = null;
    switch (speed)
    {
      case 500: // 500 kpbs
        cfg = [ 0x81, 0xD1, 0x00 ]; // 3, 2, 1
        break;

      default:
        break;
    }

    if (!cfg)
    {
      throw new Error('Speed not supported');
    }

    return this._writeRegisters(MCP.CNF3, Buffer.from(cfg));
  },

  _initBuffers: function()
  {
    const mask = { id: 0, ext: true };
    const filter = { id: 0, ext: true };
    const buffer = Buffer.alloc(14);
  
    return this._writeMasksAndFilters(MCP.RXM0SIDH, mask).then(() => {
      return this._writeMasksAndFilters(MCP.RXM1SIDH, mask);
    }).then(() => {
      return this._writeMasksAndFilters(MCP.RXF0SIDH, filter);
    }).then(() => {
      return this._writeMasksAndFilters(MCP.RXF1SIDH, filter);
    }).then(() => {
      return this._writeMasksAndFilters(MCP.RXF2SIDH, filter);
    }).then(() => {
      return this._writeMasksAndFilters(MCP.RXF3SIDH, filter);
    }).then(() => {
      return this._writeMasksAndFilters(MCP.RXF4SIDH, filter);
    }).then(() => {
      return this._writeMasksAndFilters(MCP.RXF5SIDH, filter);
    }).then(() => {
      return this._writeRegisters(MCP.TXB0CTRL, buffer);
    }).then(() => {
      return this._writeRegisters(MCP.TXB1CTRL, buffer);
    }).then(() => {
      return this._writeRegisters(MCP.TXB2CTRL, buffer);
    }).then(() => {
      return this._writeRegister(MCP.RXB0CTRL, 0);
    }).then(() => {
      return this._writeRegister(MCP.RXB1CTRL, 0);
    });
  },

  _initInterrupts: function(interrupt)
  {
    // Enable RX interrupts only.
    return this._writeRegister(MCP.CANINTE, MCP.RX0IE | MCP.RX1IE).then(() => {
      if (interrupt)
      {
        interrupt.enable();
        interrupt.onEdge('falling', () => {
          this._rxInterrupt();
        });
      }
      return true;
    });
  },

  _initGPIO: function()
  {
    return this._writeRegister(MCP.BFPCTRL, 0).then(() => {
      return this._writeRegister(MCP.TXRTSCTRL, 0);
    });
  },

  _initRecvMode: function(all)
  {
    const mode = all ? MCP.RX_ANY : MCP.RX_STDEXT;
    return this._modifyRegister(MCP.RXB0CTRL, MCP.RXB_RX_MASK | MCP.RXB_BUKT_MASK, mode | MCP.RXB_BUKT_MASK).then(() => {
      return this._modifyRegister(MCP.RXB1CTRL, MCP.RXB_RX_MASK, mode);
    })
  },

  _getNextTxBuffer: function()
  {
    let retry = 10;
    const attempt = () => {
      return this._readRegister(MCP.TXB0CTRL).then((val) => {
        if ((val & MCP.TXB_TXREQ_M) === 0)
        {
          return MCP.TXB0CTRL;
        }
        return this._readRegister(MCP.TXB1CTRL).then((val) => {
          if ((val & MCP.TXB_TXREQ_M) === 0)
          {
            return MCP.TXB1CTRL;
          }
          return this._readRegister(MCP.TXB2CTRL).then((val) => {
            if ((val & MCP.TXB_TXREQ_M) === 0)
            {
              return MCP.TXB2CTRL;
            }
            else if (--retry <= 0)
            {
              reject(new Error('Timeout'));
            }
            else
            {
              return attempt();
            }
          });
        });
      });
    }
    return attempt();
  },

  _rxInterrupt: function()
  {
    for (;;)
    {
      const msg = this.recvMsg();
      if (!msg)
      {
        break;
      }
      const key = `${id.id}/${id.ext}`;
      (this._listeners[key] || []).forEach((callback) => {
        callback(msg);
      });
    }
  }
};

module.exports = can;
