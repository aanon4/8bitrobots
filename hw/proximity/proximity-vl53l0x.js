'use strict';

console.info('Loading VL53L0X Proximity sensors.');

const VL53L0X_ADDRESS =
{
  SYSRANGE_START                              : 0x00,

  SYSTEM_THRESH_HIGH                          : 0x0C,
  SYSTEM_THRESH_LOW                           : 0x0E,

  SYSTEM_SEQUENCE_CONFIG                      : 0x01,
  SYSTEM_RANGE_CONFIG                         : 0x09,
  SYSTEM_INTERMEASUREMENT_PERIOD              : 0x04,

  SYSTEM_INTERRUPT_CONFIG_GPIO                : 0x0A,

  GPIO_HV_MUX_ACTIVE_HIGH                     : 0x84,

  SYSTEM_INTERRUPT_CLEAR                      : 0x0B,

  RESULT_INTERRUPT_STATUS                     : 0x13,
  RESULT_RANGE_STATUS                         : 0x14,

  RESULT_CORE_AMBIENT_WINDOW_EVENTS_RTN       : 0xBC,
  RESULT_CORE_RANGING_TOTAL_EVENTS_RTN        : 0xC0,
  RESULT_CORE_AMBIENT_WINDOW_EVENTS_REF       : 0xD0,
  RESULT_CORE_RANGING_TOTAL_EVENTS_REF        : 0xD4,
  RESULT_PEAK_SIGNAL_RATE_REF                 : 0xB6,

  ALGO_PART_TO_PART_RANGE_OFFSET_MM           : 0x28,

  I2C_SLAVE_DEVICE_ADDRESS                    : 0x8A,

  MSRC_CONFIG_CONTROL                         : 0x60,

  PRE_RANGE_CONFIG_MIN_SNR                    : 0x27,
  PRE_RANGE_CONFIG_VALID_PHASE_LOW            : 0x56,
  PRE_RANGE_CONFIG_VALID_PHASE_HIGH           : 0x57,
  PRE_RANGE_MIN_COUNT_RATE_RTN_LIMIT          : 0x64,

  FINAL_RANGE_CONFIG_MIN_SNR                  : 0x67,
  FINAL_RANGE_CONFIG_VALID_PHASE_LOW          : 0x47,
  FINAL_RANGE_CONFIG_VALID_PHASE_HIGH         : 0x48,
  FINAL_RANGE_CONFIG_MIN_COUNT_RATE_RTN_LIMIT : 0x44,

  PRE_RANGE_CONFIG_SIGMA_THRESH_HI            : 0x61,
  PRE_RANGE_CONFIG_SIGMA_THRESH_LO            : 0x62,

  PRE_RANGE_CONFIG_VCSEL_PERIOD               : 0x50,
  PRE_RANGE_CONFIG_TIMEOUT_MACROP_HI          : 0x51,
  PRE_RANGE_CONFIG_TIMEOUT_MACROP_LO          : 0x52,

  SYSTEM_HISTOGRAM_BIN                        : 0x81,
  HISTOGRAM_CONFIG_INITIAL_PHASE_SELECT       : 0x33,
  HISTOGRAM_CONFIG_READOUT_CTRL               : 0x55,

  FINAL_RANGE_CONFIG_VCSEL_PERIOD             : 0x70,
  FINAL_RANGE_CONFIG_TIMEOUT_MACROP_HI        : 0x71,
  FINAL_RANGE_CONFIG_TIMEOUT_MACROP_LO        : 0x72,
  CROSSTALK_COMPENSATION_PEAK_RATE_MCPS       : 0x20,

  MSRC_CONFIG_TIMEOUT_MACROP                  : 0x46,

  SOFT_RESET_GO2_SOFT_RESET_N                 : 0xBF,
  IDENTIFICATION_MODEL_ID                     : 0xC0,
  IDENTIFICATION_REVISION_ID                  : 0xC2,

  OSC_CALIBRATE_VAL                           : 0xF8,

  GLOBAL_CONFIG_VCSEL_WIDTH                   : 0x32,
  GLOBAL_CONFIG_SPAD_ENABLES_REF_0            : 0xB0,
  GLOBAL_CONFIG_SPAD_ENABLES_REF_1            : 0xB1,
  GLOBAL_CONFIG_SPAD_ENABLES_REF_2            : 0xB2,
  GLOBAL_CONFIG_SPAD_ENABLES_REF_3            : 0xB3,
  GLOBAL_CONFIG_SPAD_ENABLES_REF_4            : 0xB4,
  GLOBAL_CONFIG_SPAD_ENABLES_REF_5            : 0xB5,

  GLOBAL_CONFIG_REF_EN_START_SELECT           : 0xB6,
  DYNAMIC_SPAD_NUM_REQUESTED_REF_SPAD         : 0x4E,
  DYNAMIC_SPAD_REF_EN_START_OFFSET            : 0x4F,
  POWER_MANAGEMENT_GO1_POWER_FORCE            : 0x80,

  VHV_CONFIG_PAD_SCL_SDA__EXTSUP_HV           : 0x89,

  ALGO_PHASECAL_LIM                           : 0x30,
  ALGO_PHASECAL_CONFIG_TIMEOUT                : 0x30,
};

const DEFAULT_I2C_ADDRESS = 0x29;
const TOPIC_PROXIMITY = { topic: 'proximity', latching: true };

function proximity(config)
{
  this._name = config.name;
  if (config.i2c.address() != DEFAULT_I2C_ADDRESS)
  {
    throw new Error('Unsupported address');
  }
  this._node = rosNode.init(config.name);
  this._i2c = config.i2c;
  this._clock = null;

  this._readBytes = this._readBytesI2C;
  this._writeBytes = this._writeBytesI2C;

  this._dataInit();
}

proximity.prototype =
{
  enable: function()
  {
    this._adProximity = this._node.advertise(TOPIC_PROXIMITY);

    this._clock = setInterval(() => {
      this._processTick();
    }, 100);

    this._staticInit();
    this._setReferenceSpadManagement();
    this._setRefCalibration();
    this._setOffsetCalibration();
    this._setXTalkValue();
    this._setDeviceMode();
    this._setGPIO();

    return this;
  },

  disable: function()
  {
    clearInterval(this._clock);
    this._node.unadvertise(TOPIC_PROXIMITY);
    return this;
  },

  _processTick: function()
  {
    //this._measureDistance();
  },

  _readRegister: function(address)
  {
    return this._readBytes(address, 1)[0];
  },

  _writeRegisters: function(sets)
  {
    sets.forEach((set) => 
    {
      this._writeBytes(set[0], [ set[1] ]);
    });
  },

  _readBytesI2C: function(address, readLen)
  {
    return this._i2c.writeAndReadBytes([ address ], readLen);
  },

  _writeBytesI2C: function(address, bytes)
  {
    return this._i2c.writeBytes([ address ].concat(bytes));
  },

  _dataInit: function()
  {
    // Set I2C standard mode
    this._writeRegisters(
    [
      [ 0x88, 0x00 ],
      [ 0xFF, 0x00 ],
      [ 0x00, 0x00 ],
      [ 0x00, 0x01 ],
      [ 0xFF, 0x00 ],
      [ 0x80, 0x00 ]
    ]);

    // Disable SIGNAL_RATE_MSRC and SIGNAL_RATE_PRE_RANGE limit checks
    // Set signal rate to 0.25 million counts per second
    const rate = Math.floor(0.25 * (1 << 7));
    this._writeRegisters(
    [
      [ VL53L0X_ADDRESS.MSRC_CONFIG_CONTROL, this._readRegister(VL53L0X_ADDRESS.MSRC_CONFIG_CONTROL) | 0x12 ],
      [ VL53L0X_ADDRESS.FINAL_RANGE_CONFIG_MIN_COUNT_RATE_RTN_LIMIT, rate / 8 ],
      [ VL53L0X_ADDRESS.FINAL_RANGE_CONFIG_MIN_COUNT_RATE_RTN_LIMIT + 1, rate & 0xFF ],
      [ VL53L0X_ADDRESS.SYSTEM_SEQUENCE_CONFIG, 0xFF ]
    ]);
  },

  _staticInit: function()
  {
  },

  _setReferenceSpadManagement: function()
  {
    // Get SPAD info
    this._writeRegisters(
    [
      [ 0x80, 0x01 ],
      [ 0xFF, 0x01 ],
      [ 0x00, 0x00 ],
      [ 0xFF, 0x06 ]
    ]);
    this._writeRegisters(
    [
      [ 0x83, this._readRegister(0x83) | 0x04 ],
      [ 0xFF, 0x07 ],
      [ 0x81, 0x01 ],
      [ 0x80, 0x01 ],
      [ 0x94, 0x6B ],
      [ 0x83, 0x00 ]
    ]);

    while (this._readRegister(0x83) == 0x00)
      ;
    this._writeRegisters(
    [
      [ 0x83, 0x01 ]
    ]);
    const tmp = this._readRegister(0x92);
    const count = tmp & 0x7F;
    const typeIsAperture = !!(tmp >> 7);

    this._writeRegisters(
    [
      [ 0x81, 0x00 ],
      [ 0xFF, 0x06 ]
    ]);
    this._writeRegisters(
    [
      [ 0x83, this._readRegister(0x83) & ~0x04 ],
      [ 0xFF, 0x01 ],
      [ 0x00, 0x01 ],
      [ 0xFF, 0x00 ],
      [ 0x80, 0x00 ]
    ]);

    const map = this._readBytes(VL53L0X_ADDRESS.GLOBAL_CONFIG_SPAD_ENABLES_REF_0, 6);
    const firstSpadToEnable = typeIsAperture ? 12 : 0;
    let spadsEnabled = 0;
    for (let i = 0; i < 48; i++)
    {
      if (i < firstSpadToEnable || spadsEnabled == count)
      {
        map[i / 8] &= ~(1 << (i % 8));
      }
      else if ((map[i / 8] >> (i % 8)) & 1)
      {
        spadsEnabled++;
      }
    }

    this._writeRegisters(
    [
      [ 0xFF, 0x01 ],
      [ VL53L0X_ADDRESS.DYNAMIC_SPAD_REF_EN_START_OFFSET, 0x00 ],
      [ VL53L0X_ADDRESS.DYNAMIC_SPAD_NUM_REQUESTED_REF_SPAD, 0x2C ],
      [ 0xFF, 0x00 ],
      [ VL53L0X_ADDRESS.GLOBAL_CONFIG_REF_EN_START_SELECT, 0xB4 ],
      [ VL53L0X_ADDRESS.GLOBAL_CONFIG_SPAD_ENABLES_REF_0, map[0] ],
      [ VL53L0X_ADDRESS.GLOBAL_CONFIG_SPAD_ENABLES_REF_1, map[1] ],
      [ VL53L0X_ADDRESS.GLOBAL_CONFIG_SPAD_ENABLES_REF_2, map[2] ],
      [ VL53L0X_ADDRESS.GLOBAL_CONFIG_SPAD_ENABLES_REF_3, map[3] ],
      [ VL53L0X_ADDRESS.GLOBAL_CONFIG_SPAD_ENABLES_REF_4, map[4] ],
      [ VL53L0X_ADDRESS.GLOBAL_CONFIG_SPAD_ENABLES_REF_5, map[5] ]
    ]);
  },

  _setRefCalibration: function()
  {
    this._writeRegisters(
    [
      [ 0xFF, 0x01 ],
      [ 0x00, 0x00 ],
      
      [ 0xFF, 0x00 ],
      [ 0x09, 0x00 ],
      [ 0x10, 0x00 ],
      [ 0x11, 0x00 ],
      
      [ 0x24, 0x01 ],
      [ 0x25, 0xFF ],
      [ 0x75, 0x00 ],
      
      [ 0xFF, 0x01 ],
      [ 0x4E, 0x2C ],
      [ 0x48, 0x00 ],
      [ 0x30, 0x20 ],
      
      [ 0xFF, 0x00 ],
      [ 0x30, 0x09 ],
      [ 0x54, 0x00 ],
      [ 0x31, 0x04 ],
      [ 0x32, 0x03 ],
      [ 0x40, 0x83 ],
      [ 0x46, 0x25 ],
      [ 0x60, 0x00 ],
      [ 0x27, 0x00 ],
      [ 0x50, 0x06 ],
      [ 0x51, 0x00 ],
      [ 0x52, 0x96 ],
      [ 0x56, 0x08 ],
      [ 0x57, 0x30 ],
      [ 0x61, 0x00 ],
      [ 0x62, 0x00 ],
      [ 0x64, 0x00 ],
      [ 0x65, 0x00 ],
      [ 0x66, 0xA0 ],
      
      [ 0xFF, 0x01 ],
      [ 0x22, 0x32 ],
      [ 0x47, 0x14 ],
      [ 0x49, 0xFF ],
      [ 0x4A, 0x00 ],
      
      [ 0xFF, 0x00 ],
      [ 0x7A, 0x0A ],
      [ 0x7B, 0x00 ],
      [ 0x78, 0x21 ],
      
      [ 0xFF, 0x01 ],
      [ 0x23, 0x34 ],
      [ 0x42, 0x00 ],
      [ 0x44, 0xFF ],
      [ 0x45, 0x26 ],
      [ 0x46, 0x05 ],
      [ 0x40, 0x40 ],
      [ 0x0E, 0x06 ],
      [ 0x20, 0x1A ],
      [ 0x43, 0x40 ],
      
      [ 0xFF, 0x00 ],
      [ 0x34, 0x03 ],
      [ 0x35, 0x44 ],
      
      [ 0xFF, 0x01 ],
      [ 0x31, 0x04 ],
      [ 0x4B, 0x09 ],
      [ 0x4C, 0x05 ],
      [ 0x4D, 0x04 ],
      
      [ 0xFF, 0x00 ],
      [ 0x44, 0x00 ],
      [ 0x45, 0x20 ],
      [ 0x47, 0x08 ],
      [ 0x48, 0x28 ],
      [ 0x67, 0x00 ],
      [ 0x70, 0x04 ],
      [ 0x71, 0x01 ],
      [ 0x72, 0xFE ],
      [ 0x76, 0x00 ],
      [ 0x77, 0x00 ],
      
      [ 0xFF, 0x01 ],
      [ 0x0D, 0x01 ],
      
      [ 0xFF, 0x00 ],
      [ 0x80, 0x01 ],
      [ 0x01, 0xF8 ],
      
      [ 0xFF, 0x01 ],
      [ 0x8E, 0x01 ],
      [ 0x00, 0x01 ],
      [ 0xFF, 0x00 ],
      [ 0x80, 0x00 ]      
    ]);
  },

  _setOffsetCalibration: function()
  {
  },

  _setXTalkValue: function()
  {
  },

  _setDeviceMode: function()
  {
  },

  _setGPIO: function()
  {
    this._writeRegisters(
    [
      [ VL53L0X_ADDRESS.SYSTEM_INTERRUPT_CONFIG_GPIO, 0x04 ],
      [ VL53L0X_ADDRESS.GPIO_HV_MUX_ACTIVE_HIGH, this._readRegister(VL53L0X_ADDRESS.GPIO_HV_MUX_ACTIVE_HIGH) & ~0x10 ],
      [ VL53L0X_ADDRESS.SYSTEM_INTERRUPT_CLEAR, 0x01 ]
    ]);
  }
}

module.exports = proximity;
