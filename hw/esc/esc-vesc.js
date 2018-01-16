'use strict';

console.info('Loading VESCs (UART).');

const SerialPort = require('serialport');
const crc16 = require('crc16');
const MotionPlanner = require('services/motion-planner');

const STATE =
{
  RECV_READY: 1,
  RECV_SHORT: 2,
  RECV_LONG1: 3,
  RECV_LONG2: 4,
  RECV_DATA: 5,
  RECV_CRC1: 6,
  RECV_CRC2: 7,
};
const PKT =
{
  COMM_FW_VERSION: 0,
  COMM_JUMP_TO_BOOTLOADER: 1,
  COMM_ERASE_NEW_APP: 2,
  COMM_WRITE_NEW_APP_DATA: 3,
  COMM_GET_VALUES: 4,
  COMM_SET_DUTY: 5,
  COMM_SET_CURRENT: 6,
  COMM_SET_CURRENT_BRAKE: 7,
  COMM_SET_RPM: 8,
  COMM_SET_POS: 9,
  COMM_SET_HANDBRAKE: 10,
  COMM_SET_DETECT: 11,
  COMM_SET_SERVO_POS: 12,
  COMM_SET_MCCONF: 13,
  COMM_GET_MCCONF: 14,
  COMM_GET_MCCONF_DEFAULT: 15,
  COMM_SET_APPCONF: 16,
  COMM_GET_APPCONF: 17,
  COMM_GET_APPCONF_DEFAULT: 18,
  COMM_SAMPLE_PRINT: 19,
  COMM_TERMINAL_CMD: 20,
  COMM_PRINT: 21,
  COMM_ROTOR_POSITION: 22,
  COMM_EXPERIMENT_SAMPLE: 23,
  COMM_DETECT_MOTOR_PARAM: 24,
  COMM_DETECT_MOTOR_R_L: 25,
  COMM_DETECT_MOTOR_FLUX_LINKAGE: 26,
  COMM_DETECT_ENCODER: 27,
  COMM_DETECT_HALL_FOC: 28,
  COMM_REBOOT: 29,
  COMM_ALIVE: 30,
  COMM_GET_DECODED_PPM: 31,
  COMM_GET_DECODED_ADC: 32,
  COMM_GET_DECODED_CHUK: 33,
  COMM_FORWARD_CAN: 34,
  COMM_SET_CHUCK_DATA: 35,
  COMM_CUSTOM_APP_DATA: 36,
  COMM_NRF_START_PAIRING: 37
};
const CAN =
{
  SET_DUTY: 0,
  SET_CURRENT: 1,
  SET_CURRENT_BRAKE: 2,
  SET_RPM: 3,
  SET_POS: 4,
  FILL_RX_BUFFER: 5,
  FILL_RX_BUFFER_LONG: 6,
  PROCESS_RX_BUFFER: 7,
  PROCESS_SHORT_BUFFER: 8,
  STATUS: 9,
  SET_CURRENT_REL: 10,
  SET_CURRENT_BRAKE_REL: 11,
  STATUS2: 12
};
const PKT_MAX_LENGTH = 1024;
const CYCLE_MS = 10;
const RPM_CHANGE_RATE = 200;

const TOPIC_RPM = { topic: 'rpm' };
const TOPIC_THROTTLE = { topic: 'throttle' };
const TOPIC_TACHOMETER = { topic: 'tachometer' };
const TOPIC_VOLTAGE = { topic: 'voltage' };


function vesc(config)
{
  this._name = config.name;
  this._node = rosNode.init(config.name);
  if (config.uart)
  {
    this._sendDutyMsg = this._sendDutyMsgUART;
    this._sendRpmMsg = this._sendRpmMsgUART;
    this._sendServoMsg = this._sendServoMsgUART;
    this._uart = new SerialPort(config.uart.port,
    {
      baudRate: config.uart.baud
    });
  }
  else if (config.can)
  {
    this._sendDutyMsg = this._sendDutyMsgCAN;
    this._sendRpmMsg = this._sendRpmMsgCAN;
    this._sendServoMsg = this._sendServoMsgCAN;
    this._can = config.can.can;
    this._remoteCanId = config.can.remoteId;
    this._localCanId = config.can.localId;
    this._canBuffer = Buffer.alloc(PKT_MAX_LENGTH)
  }
  else
  {
    throw new Error('UART or CAN must be defined');
  }
  this._planner = new MotionPlanner();
  this._recvState = STATE.RECV_READY;
  this._recvPos = 0;
  this._recvLength = 0;
  this._recvBuffer = null;
  this._values =
  {
    rpm: 0,
    input_voltage: 0
  };
  this._kV = 0;
  this._poles = 1;
  this._lastDuty = 0;
  this._plans = [];
  this._incomingCanStatus = this._incomingCanStatus.bind(this);
  this._incomingCanBuffer = this._incomingCanBuffer.bind(this);
  this._incomingUart = this._incomingUart.bind(this);
}

vesc.prototype =
{
  enable: function()
  {
    this._adRpm = this._node.advertise(TOPIC_RPM);
    this._adThrottle = this._node.advertise(TOPIC_THROTTLE);
    this._adTacho = this._node.advertise(TOPIC_TACHOMETER);
    this._adVolt = this._node.advertise(TOPIC_VOLTAGE);
    this._uart && this._startUart();
    this._can && this._startCan();
    return this;
  },

  disable: function()
  {
    this._uart && this._stopUart();
    this._can && this._stopCan();
    this._node.unadvertise(TOPIC_RPM);
    this._node.unadvertise(TOPIC_THROTTLE);
    this._node.unadvertise(TOPIC_TACHOMETER);
    this._node.unadvertise(TOPIC_VOLTAGE);
    return this;
  },

  setRPM: function(rpm, changeMs, func)
  {
    const maxRPM = this._maxRPM();
    let duty;
    if (rpm === 0 || maxRPM === 0)
    {
      duty = 0;
    }
    else if (rpm > 0)
    {
      duty = Math.min(1.0, rpm / maxRPM);
    }
    else
    {
      duty = Math.max(-1.0, rpm / maxRPM);
    }
    if (!changeMs)
    {
      changeMs = Math.abs(this._lastDuty - duty) * CYCLE_MS * RPM_CHANGE_RATE;
      if (changeMs == 0)
      {
        return;
      }
    }
    let plan = this._planner.generate(
    {
      start: this._lastDuty,
      cycle: CYCLE_MS,
      steps:
      [
        {
          end: duty,
          func: func,
          time: changeMs
        }
      ]
    });
    this._lastDuty = duty;
    this._plans.push(plan);
    if (this._plans.length === 1)
    {
      let idx = 0;
      const run = () => {
        const plan = this._plans[0];
        const fvalue = plan[idx++];
        this._sendDutyMsg(fvalue);
        if (idx >= plan.length)
        {
          idx = 0;
          this._plans.shift();
          if (this._plans.length === 0)
          {
            clearInterval(this._timer);
            this._timer = setInterval(() => {
              this._sendDutyMsg(fvalue);
            }, CYCLE_MS);
          }
        }
      }
      run();
      if (this._plans.length !== 0)
      {
        clearInterval(this._timer);
        this._timer = setInterval(run, CYCLE_MS);
      }
    }
  },

  getCurrentRPM: function()
  {
    return this._values.rpm;
  },

  isRPMChanging: function()
  {
    return this._plans.length !== 0;
  },

  setKVandPoles: function(kV, poles)
  {
    this._kV = kV;
    this._poles = poles;
  },

  openServo: function()
  {
    if (!this._servo)
    {
      const SERVO_MIN = 1.0;
      const SERVO_MID = 1.5;
      const SERVO_MAX = 2.0;

      this._servo =
      {
        _cycle: 0,
        _currentValue: SERVO_MID,
        _targetValue: SERVO_MID,
        _plans: [],

        enable: () => {
        },

        disable: () => {
        },

        setCyclePeriod: (periodMs) => {
          this._servo._cycle = periodMs;
        },
      
        setPlan: (steps) => {
          let plan = this._planner.generate(
            {
              start: this._servo._targetValue,
              cycle: this._servo._cycle,
              steps: steps
            });
            this._targetValue = steps[steps.length -1].end;
            this._servo._plans.push(plan);
            if (this._servo._plans.length === 1)
            {
              let timer = null;
              let idx = 0;
              const run = () => {
                const plan = this._servo._plans[0];
                this._servo._currentValue = plan[idx++];
                const fvalue = 1000 * (this._servo._currentValue - SERVO_MIN) / (SERVO_MAX - SERVO_MIN);
                this._sendServoMsg(fvalue);
                if (idx >= plan.length)
                {
                  idx = 0;
                  this._servo._plans.shift();
                  if (this._servo._plans.length === 0)
                  {
                    clearInterval(timer);
                  }
                }
              }
              run();
              if (this._servo._plans.length !== 0)
              {
                timer = setInterval(run, this._servo._cycle);
              }
            }
        },
      
        getCurrentPulse: () => {
          return this._servo._currentValue;
        },
      
        getTargetPulse: () => {
          return this._servo._targetValue;
        },
      
        isPulseChanging: () => {
          return this._servo._plans.length !== 0;
        },
      
        idle: () => {
          // Ignore
        }
      };
    }
    return this._servo;
  },

  _sendRpmMsgUART: function(rpm)
  {
    const cmd = Buffer.alloc(5);
    cmd.writeUInt8(PKT.COMM_SET_RPM, 0);
    cmd.writeUInt32BE(rpm, 1);
    this._sendPktUart(cmd);
  },

  _sendServoMsgUART: function(pos)
  {
    const cmd = Buffer.alloc(3);
    cmd.writeUInt8(PKT.COMM_SET_SERVO_POS, 0);
    cmd.writeUInt16BE(pos, 1);
    this._sendPktUart(cmd);
  },

  _sendRpmMsgCAN: function(rpm)
  {
    const id = { id: this._remoteCanId | (CAN.SET_RPM << 8), ext: true };
    const msg = Buffer.alloc(4);
    msg.writeUInt32BE(rpm, 0);
    this._can.sendMsg(id, msg, false);
  },

  _sendDutyMsgCAN: function(duty)
  {
    const id = { id: this._remoteCanId | (CAN.SET_DUTY << 8), ext: true };
    const msg = Buffer.alloc(4);
    msg.writeInt32BE(duty * 100000.0, 0);
    this._can.sendMsg(id, msg, false);
  },

  _sendServoMsgCAN: function(pos)
  {
    const id = { id: this._remoteCanId | (CAN.PROCESS_SHORT_BUFFER << 8), ext: true };
    const msg = Buffer.from([ this._localCanId, 0, PKT.COMM_SET_SERVO_POS, 0, 0]);
    msg.writeUInt16BE(pos, 3);
    this._can.sendMsg(id, msg, false);
  },

  _sendGetValuesMsgCAN: function()
  {
    const id = { id: this._remoteCanId | (CAN.PROCESS_SHORT_BUFFER << 8), ext: true };
    const msg = Buffer.from([ this._localCanId, 0, PKT.COMM_GET_VALUES ]);
    this._can.sendMsg(id, msg, false);
  },

  _startCan: function()
  {
    const id = { id: this._remoteCanId | (CAN.STATUS << 8), ext: true };
    this._can.addListener(id, this._incomingCanStatus);
    const id2 = { id: this._remoteCanId | (CAN.STATUS2 << 8), ext: true };
    this._can.addListener(id2, this._incomingCanStatus);

    const ids =
    [
      { id: this._localCanId | (CAN.PROCESS_SHORT_BUFFER << 8), ext: true },
      { id: this._localCanId | (CAN.FILL_RX_BUFFER << 8), ext: true },
      { id: this._localCanId | (CAN.FILL_RX_BUFFER_LONG << 8), ext: true },
      { id: this._localCanId | (CAN.PROCESS_RX_BUFFER << 8), ext: true }
    ];
    ids.forEach((id) => {
      this._can.addListener(id, this._incomingCanBuffer);
    });
  },

  _stopCan: function()
  {
    const id = { id: this._remoteCanId | (CAN.PACKET_STATUS << 8), ext: true };
    this._can.removeListener(id, this._incomingCanStatus);
    const id2 = { id: this._remoteCanId | (CAN.STATUS2 << 8), ext: true };
    this._can.removeListener(id2, this._incomingCanStatus);

    const ids =
    [
      { id: this._localCanId | (CAN.PROCESS_SHORT_BUFFER << 8), ext: true },
      { id: this._localCanId | (CAN.FILL_RX_BUFFER << 8), ext: true },
      { id: this._localCanId | (CAN.FILL_RX_BUFFER_LONG << 8), ext: true },
      { id: this._localCanId | (CAN.PROCESS_RX_BUFFER << 8), ext: true }
    ];
    ids.forEach((id) => {
      this._can.removeListener(id, this._incomingCanBuffer);
    });
  },

  _incomingCanStatus: function(pkt)
  {
    const msg = pkt.msg;
    const type = (pkt.id.id >> 8) & 0xFF;
    switch (type)
    {
      case CAN.STATUS:
        this._values.rpm = Math.abs(msg.readInt32BE(0) / (this._poles / 2));
        this._values.tot_current = msg.readInt16BE(4) / 10.0
        this._values.duty_cycle = msg.readInt16BE(6) / 1000.0;
    
        this._adRpm.publish({ rpm: this._values.rpm });
        this._adThrottle.publish({ throttle: this._values.duty_cycle });
        break;

      case CAN.STATUS2:
        this._values.tachometer = msg.readInt32BE(0);
        this._values.input_voltage = msg.readInt16BE(4) / 10.0

        this._adTacho.publish({ tachometer: this._values.tachometer });
        this._adVolt.publish({ v: this._values.input_voltage });
        break;

      default:
        break;
    }
  },

  _incomingCanBuffer: function(pkt)
  {
    const msg = pkt.msg;
    const type = (pkt.id.id >> 8) & 0xFF;
    switch (type)
    {
      case CAN.FILL_RX_BUFFER:
        msg.copy(this._canBuffer, msg[0], 1);
        break;
      case CAN.FILL_RX_BUFFER_LONG:
        msg.copy(this._canBuffer, msg.readUInt16BE(0), 2);
        break;
      case CAN.PROCESS_RX_BUFFER:
        const buf = this._canBuffer.slice(0, msg.readUInt32BE(2));
        if (crc16(buf) === msg.readUInt16BE(4))
        {
          this._processPkt(buf);
        }
        break;
      case CAN.PROCESS_SHORT_BUFFER:
        this._processPkt(msg.slice(2));
        break;
      default:
        break;
    }
  },

  _startUart: function()
  {
    this._uart.on('data', _incomingUart);

    const cmd = Buffer.from([ PKT.COMM_GET_VALUES ]);

    this._pollTimer = setInterval(() => {
      this._sendPktUart(cmd);
    }, CYCLE_MS);
  },

  _stopUart: function()
  {
    clearInterval(this._pollTimer);
    this._pollTimer = null;
    this._uart.removeListener('data', _incomingUart);
  },

  _sendPktUart: function(pkt)
  {
    const len = pkt.length;
    if (len < 256)
    {
      this._uart.write([ 2, len ], 'binary');
    }
    else
    {
      this._uart.write([ 3, len >> 8, len & 0xFF ], 'binary');
    }
    this._uart.write(pkt);
    let crc = crc16(pkt);
    this._uart.write([ crc >> 8, crc & 0xFF ], 'binary');
  },

  _incomingUart: function(buffer)
  {
    for (let i = 0; i < buffer.length; i++)
    {
      const byte = buffer[i];
      switch (this._recvState)
      {
        case STATE.RECV_READY:
          if (byte === 2)
          {
            this._recvState = STATE.RECV_SHORT;
          }
          else if (byte === 3)
          {
            this._recvState = STATE.RECV_LONG1;
          }
          break;
        
        case STATE.RECV_SHORT:
          this._recvPos = 0;
          this._recvLength = byte;
          this._recvState = STATE.RECV_DATA;
          this._recvBuffer = new Uint8Array(this._recvLength);
          break;

        case STATE.RECV_LONG1:
          this._recvLength = byte;
          this._recvState = STATE.RECV_LONG2;
          break;

        case STATE.RECV_LONG2:
          this._recvPos = 0;
          this._recvLength = (this._recvLength << 8) + byte;
          if (this._recvLength > PKT_MAX_LENGTH)
          {
            this._recvState = STATE.RECV_READY;
          }
          else
          {
            this._recvState = STATE.RECV_DATA;
            this._recvBuffer = new Uint8Array(this._recvLength);
          }
          break;

        case STATE.RECV_DATA:
          this._recvBuffer[this._recvPos++] = byte;
          if (this._recvPos >= this._recvLength)
          {
            this._recvState = STATE.RECV_CRC1;
          }
          break;

        case STATE.RECV_CRC1:
          this._recvCRC = byte;
          this._recvState = STATE.RECV_CRC2;
          break;

        case STATE.RECV_CRC2:
          this._recvCRC = (this._recvCRC << 8) + byte;
          this._recvState = STATE.RECV_READY;
          if (this._recvCRC === crc16(this._recvBuffer))
          {
            this._processPkt(this._recvBuffer);
          }
          break;

        default:
          break;
      }
    }
  },

  _processPkt: function(pkt)
  {
    switch (pkt[0])
    {
      case PKT.COMM_GET_VALUES:
        this._values.temp_fet = pkt.readInt16BE(1) / 10;
        this._values.temp_motor = pkt.readInt16BE(3) / 10;
        this._values.avg_motor_current = pkt.readInt32BE(5) / 100;
        this._values.avg_input_current = pkt.readInt32BE(9) / 100;
        this._values.avg_id = pkt.readInt32BE(13) / 100;
        this._values.avg_iq = pkt.readInt32BE(17) / 100;
        this._values.duty_cycle = pkt.readInt16BE(21) / 1000;
        this._values.rpm = Math.abs(pkt.readUInt32BE(23) / (this._poles / 2));
        this._values.input_voltage = pkt.readInt16BE(27) / 10;
        this._values.amp_hours = pkt.readInt32BE(29) / 1000;
        this._values.amp_hours_charged = pkt.readInt32BE(33) / 1000;
        this._values.watt_hours = pkt.readInt32BE(37) / 1000;
        this._values.watt_hours_charged = pkt.readInt32BE(41) / 1000;
        this._values.tachometer = pkt.readUInt32BE(45);
        this._values.tachometer_abs = pkt.readUInt32BE(49);
        this._values.fault = pkt.readUInt8(53);

        this._adRpm.publish({ rpm: this._values.rpm });
        this._adThrottle.publish({ rpm: this._values.duty_cycle });
        break;

      default:
        break;
    }
  },

  _maxRPM: function()
  {
    return this._values.input_voltage * this._kV;
  },
};

module.exports = vesc;
