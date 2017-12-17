function PID(config)
{
  var ITerm = 0;
  var lastError = 0;
  const outMax = config.outMax || Number.MAX_SAFE_INTEGER;
  const outMin = config.outMin || Number.MIN_SAFE_INTEGER;
  const inNeutralMax = config.inNeutralMax || 0;
  const inNeutralMin = config.inNeutralMin || 0;
  const outNeutralMax = config.outNeutralMax || 0;
  const outNeutralMin = config.outNeutralMin || 0;
  var f = function(error)
  {
    if (error > inNeutralMin && error < inNeutralMax)
    {
      error = 0;
    }
    var PTerm = config.Kp * error;
    ITerm += config.Ki * error;
    if (ITerm > outMax)
    {
      ITerm = outMax;
    }
    else if (ITerm < outMin)
    {
      ITerm = outMin;
    }
    var DTerm = config.Kd * (error - lastError);
    lastError = error;
    var out = PTerm + ITerm + DTerm;
    if (out > outNeutralMin && out < outNeutralMax)
    {
      out = 0;
    }
    if (out > outMax)
    {
      out = outMax;
    }
    else if (out < outMin)
    {
      out = outMin;
    }
    return out;
  };
  f.reset = function()
  {
    ITerm = 0;
    lastError = 0;
  }
  return f;
}

//
// PID Tuner based on AutoTuner by Brett Beauregard
//  https://github.com/br3ttb/Arduino-PID-AutoTune-Library
//
// type: 0 == PI, 1 == PID
// sampleTimeMs: Time before next sample will be considered
// outputStart: Initial output value
// outputStep: Step to change output value by
// inputStart: Initial input value
// inputNoise: Difference the input needs to change from the initial input before a new output is generated
// outputFn: Callback to set the first output value
// 
function PIDTune(config)
{
  this._controlType = config.type;
  this._noiseBand = config.inputNoise;
  this._lastInputs = new Array(101);
  this._sampleTime = (config.sampleTimeMs > 250 ? config.sampleTimeMs : 250);
  this._oStep = config.outputStep;
  this._sampleCount = 0;
  
  this._Ku = 0;
  this._Pu = 0;
  
  this._lastTime = Date.now();
  
  this._peekCount = 0;
  this._peekType = 0;
  this._peeks = new Array(10);
  
  this._setPoint = config.inputStart;
  this._absMax = this._setPoint;
  this._absMin = this._setPoint;
  this._outputStart = config.outputStart;
  this._outputFn = config.outputFn;
  this._outputFn(this._outputStart + this._oStep);
}

PIDTune.prototype =
{
  //
  // inputValue: New value we'd feed to the PID
  // outputFn: Callbak to set the next output value
  //
  step: function(inputValue)
  {
    var now = Date.now();
    if (now - this._lastTime < this._sampleTime)
    {
      return false;
    }
    this._lastTime = now;

    if (inputValue > this._absMax)
    {
      this._absMax = inputValue;
    }
    if (inputValue < this._absMin)
    {
      this._absMin = inputValue;
    }
    
    if (inputValue > this._setPoint + this._noiseBand)
    {
      this._outputFn(this._outputStart - this._oStep);
    }
    else if (inputValue < this._setPoint - this._noiseBand)
    {
      this._outputFn(this._outputStart + this._oStep);
    }
    
    var isMax = true;
    var isMin = true;
    for (var i = this._sampleCount - 1; i >= 0; i--)
    {
      var val = this._lastInputs[i];
      if (isMax)
      {
        isMax = inputValue > val;
      }
      if (isMin)
      {
        isMin = inputValue < val;
      }
      this._lastInputs[i + 1] = this._lastInputs[i];
    }
    this._lastInputs[0] = inputValue;
    if (this._sampleCount < this._lastInputs.length - 1)
    {
      this._sampleCount++;
    }
    if (this._sampleCount < 9)
    {
      return false;
    }
    
    var justchanged = false;
    if (isMax)
    {
      if (this._peekType == 0)
      {
        this._peekType = 1;
      }
      else if (this._peekType == -1)
      {
        this._peekType = 1;
        this._peek2 = this._peek1;
        justchanged = true;
      }
      this._peek1 = now;
    }
    else if (isMin)
    {
      if (this._peekType == 0)
      {
        this._peekType = -1;
      }
      else if (this._peekType == 1)
      {
        this._peekType = -1;
        this._peekCount++;
        justchanged = true;
      }
    }
    if (this._peekCount < this._peeks.length)
    {
      this._peeks[this._peekCount] = inputValue;
    }
    
    if (this._peekCount >= this._peeks.length ||
      (justchanged && this._peekCount > 2 && (Math.abs(this._peeks[this._peekCount - 1] - this._peeks[this._peekCount - 2]) + Math.abs(this._peeks[this._peekCOunt - 2] - this._peeks[this._peekCount - 3])) / 2 < 0.05 * (absMax - absMin)))
    {
      this._outputFn(this._outputStart);
      this._Ku = 4 * 2 * this._oStep / ((this._absMax - this._absMin) * Math.PI);
      this._Pu = (this._peek1 - this._peek2) / 1000;
      return true;
    }
    else
    {
      return false;
    }
  },
  
  getPID: function()
  {
    if (this._controlType == 1)
    {
      return { Kp: 0.6 * this._Ku, Ki: 1.2 * this._Ku / this._Pu, Kd: 0.075 * this._Ku * this._Pu };
    }
    else
    {
      return { Kp: 0.4 * this._Ku, Ki: 0.48 * this._Ku / this._Pu, Kd: 0 };
    }
  }
}

PID.AutoTuner = PIDTune;

module.exports = PID;
