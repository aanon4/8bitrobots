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
const PKT_MAX_LENGTH = 1024;
const CYCLE_MS = 10;

function vesc(config)
{
  this._node = rosNode.init(config.name);
  this._port = new SerialPort(config.uart.port,
  {
    baudRate: config.uart.baud
  });
  this._planner = new MotionPlanner();
  this._recvState = STATE.RECV_READY;
  this._recvPos = 0;
  this._recvLength = 0;
  this._recvBuffer = null;
  this._values =
  {
    rpm: 0
  };
  this._lastRPM = 0;
  this._plans = [];
}

vesc.prototype =
{
  enable: function()
  {
    this._port.on('data', _incoming);
    return this;
  },

  disable: function()
  {
    this._port.removeListener('data', _incoming);
    return this;
  },

  setRPM: function(rpm, changeMs, func)
  {
    let plan = this._planner.generate(
    {
      start: this._lastRPM,
      cycle: CYCLE_MS,
      steps:
      [
        {
          end: rpm,
          func: func,
          time: changeMs
        }
      ]
    });
    this._lastRPM = rpm;
    this._plans.push(plan);
    if (this._plans.length === 1)
    {
      this._startPoll();
      let timer = null;
      let idx = 0;
      const run = () => {
        const plan = this._plans[0];
        const fvalue = plan[idx++];
        const cmd = Buffer.alloc(5);
        cmd.writeUInt8(PKT.COMM_SET_RPM, 0);
        cmd.writeUInt32BE(fvalue, 1);
        this._sendPkt(cmd);
        if (idx >= plan.length)
        {
          idx = 0;
          this._plans.shift();
          if (this._plans.length === 0)
          {
            this._stopPoll();
            clearInterval(timer);
          }
        }
      }
      run();
      if (this._plans.length !== 0)
      {
        timer = setInterval(run, CYCLE_MS);
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

  setKV: function(kV)
  {
  },

  getServoChannel: function()
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

        setCyclePeriod: (periodMs) => {
          this._cycle = periodMs;
        },
      
        setPlan: (steps) => {
          let plan = this._planner.generate(
            {
              start: this._targetValue,
              cycle: this._cycle,
              steps: steps
            });
            this._targetValue = steps[steps.length -1].end;
            this._plans.push(plan);
            if (this._plans.length === 1)
            {
              let timer = null;
              let idx = 0;
              const run = () => {
                const plan = this._plans[0];
                this._currentValue = plan[idx++];
                const fvalue = 1000 * (this._currentValue - SERVO_MIN) / (SERVO_MAX - SERVO_MIN);
                const cmd = Buffer.alloc(3);
                cmd.writeUInt8(PKT.COMM_SET_SERVO_POS, 0);
                cmd.writeUInt16BE(fvalue, 1);
                this._sendPkt(cmd);
                if (idx >= plan.length)
                {
                  idx = 0;
                  this._plans.shift();
                  if (this._plans.length === 0)
                  {
                    clearInterval(timer);
                  }
                }
              }
              run();
              if (this._plans.length !== 0)
              {
                timer = setInterval(run, this._cycle);
              }
            }
        },
      
        getCurrentPulse: () => {
          return this._currentValue;
        },
      
        getTargetPulse: () => {
          return this._targetValue;
        },
      
        isPulseChanging: () => {
          return this._plans.length !== 0;
        },
      
        idle: () => {
          // Ignore
        }
      };
    }
    return this._servo;
  },

  _startPoll: function()
  {
    const cmd = Buffer.alloc(1);
    cmd.writeUInt8(PKT.COMM_GET_VALUES, 0);

    this._stopPoll();
    this._pollTimer = setInterval(() => {
      this._sendPkt(cmd);
    }, CYCLE_MS);
  },

  _stopPoll: function()
  {
    clearInterval(this._pollTimer);
    this._pollTimer = null;
  },

  _sendPkt: function(pkt)
  {
    const len = pkt.length;
    if (len < 256)
    {
      this._port.write([ 2, len ], 'binary');
    }
    else
    {
      this._port.write([ 3, len >> 8, len & 0xFF ], 'binary');
    }
    this._port.write(pkt);
    let crc = crc16(pkt);
    this._port.write([ crc >> 8, crc & 0xFF ], 'binary');
  },

  _incoming: (buffer) => {
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
        this._values.rpm = pkt.readUInt32BE(23);
        this._values.input_voltage = pkt.readInt16BE(27) / 10;
        this._values.amp_hours = pkt.readInt32BE(29) / 1000;
        this._values.amp_hours_charged = pkt.readInt32BE(33) / 1000;
        this._values.watt_hours = pkt.readInt32BE(37) / 1000;
        this._values.watt_hours_charged = pkt.readInt32BE(41) / 1000;
        this._values.tachometer = pkt.readUInt32BE(45);
        this._values.tachometer_abs = pkt.readUInt32BE(49);
        this._values.fault = pkt.readUInt8(53);
        break;

      default:
        break;
    }
  }
};

module.exports = vesc;
