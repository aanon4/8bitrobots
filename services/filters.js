const filters =
{
  Median: function(sampleSize)
  {
    var samples = Array(sampleSize);
    var idx = 0;
    var center = Math.floor(sampleSize / 2);
    var currentValue = null;
    return {
      value: function()
      {
        return currentValue;
      },
      
      update: function(value)
      {
        samples[idx] = value;
        idx = (idx + 1) % sampleSize;
        currentValue = samples.concat().sort()[center];
      }
    };
  },

  Ramp: function(change)
  {
    var currentValue = 0;
    return {
      value: function()
      {
        return currentValue;
      },

      update: function(value)
      {
        var diff = value - currentValue;
        if (Math.abs(diff) <= change)
        {
          currentValue = value;
        }
        else
        {
          currentValue += (diff > 0 ? change : -change);
        }
        return currentValue;
      },

      reset: function()
      {
        currentValue = 0;
      }
    };
  }
};
    
module.exports = filters;
