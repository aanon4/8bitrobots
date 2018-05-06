'use strict';

console.info('Loading Motion Planner.');

const scurve = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0001,0.0002,0.0002,0.0002,0.0002,0.0002,0.0003,0.0003,0.0003,0.0003,0.0004,0.0004,0.0004,0.0005,0.0005,0.0005,0.0006,0.0006,0.0006,0.0007,0.0007,0.0008,0.0008,0.0009,0.0009,0.001,0.001,0.0011,0.0011,0.0012,0.0013,0.0013,0.0014,0.0014,0.0015,0.0016,0.0017,0.0017,0.0018,0.0019,0.002,0.0021,0.0022,0.0023,0.0024,0.0025,0.0026,0.0027,0.0028,0.0029,0.003,0.0031,0.0032,0.0033,0.0035,0.0036,0.0037,0.0038,0.004,0.0041,0.0043,0.0044,0.0045,0.0047,0.0048,0.005,0.0052,0.0053,0.0055,0.0057,0.0058,0.006,0.0062,0.0064,0.0066,0.0068,0.0069,0.0071,0.0073,0.0076,0.0078,0.008,0.0082,0.0084,0.0086,0.0089,0.0091,0.0093,0.0096,0.0098,0.0101,0.0103,0.0106,0.0108,0.0111,0.0113,0.0116,0.0119,0.0122,0.0125,0.0127,0.013,0.0133,0.0136,0.0139,0.0143,0.0146,0.0149,0.0152,0.0155,0.0159,0.0162,0.0165,0.0169,0.0172,0.0176,0.018,0.0183,0.0187,0.0191,0.0194,0.0198,0.0202,0.0206,0.021,0.0214,0.0218,0.0222,0.0226,0.0231,0.0235,0.0239,0.0244,0.0248,0.0252,0.0257,0.0262,0.0266,0.0271,0.0276,0.028,0.0285,0.029,0.0295,0.03,0.0305,0.031,0.0315,0.032,0.0326,0.0331,0.0336,0.0342,0.0347,0.0353,0.0358,0.0364,0.0369,0.0375,0.0381,0.0387,0.0393,0.0399,0.0405,0.0411,0.0417,0.0423,0.0429,0.0435,0.0442,0.0448,0.0455,0.0461,0.0468,0.0474,0.0481,0.0488,0.0494,0.0501,0.0508,0.0515,0.0522,0.0529,0.0536,0.0544,0.0551,0.0558,0.0566,0.0573,0.058,0.0588,0.0596,0.0603,0.0611,0.0619,0.0627,0.0634,0.0642,0.065,0.0658,0.0667,0.0675,0.0683,0.0691,0.07,0.0708,0.0717,0.0725,0.0734,0.0742,0.0751,0.076,0.0769,0.0778,0.0787,0.0796,0.0805,0.0814,0.0823,0.0832,0.0842,0.0851,0.086,0.087,0.0879,0.0889,0.0899,0.0908,0.0918,0.0928,0.0938,0.0948,0.0958,0.0968,0.0978,0.0988,0.0999,0.1009,0.1019,0.103,0.104,0.1051,0.1062,0.1072,0.1083,0.1094,0.1105,0.1116,0.1127,0.1138,0.1149,0.116,0.1171,0.1183,0.1194,0.1205,0.1217,0.1228,0.124,0.1252,0.1263,0.1275,0.1287,0.1299,0.1311,0.1323,0.1335,0.1347,0.1359,0.1371,0.1383,0.1396,0.1408,0.1421,0.1433,0.1446,0.1458,0.1471,0.1484,0.1497,0.1509,0.1522,0.1535,0.1548,0.1561,0.1575,0.1588,0.1601,0.1614,0.1628,0.1641,0.1655,0.1668,0.1682,0.1695,0.1709,0.1723,0.1737,0.175,0.1764,0.1778,0.1792,0.1806,0.1821,0.1835,0.1849,0.1863,0.1878,0.1892,0.1906,0.1921,0.1936,0.195,0.1965,0.1979,0.1994,0.2009,0.2024,0.2039,0.2054,0.2069,0.2084,0.2099,0.2114,0.2129,0.2145,0.216,0.2175,0.2191,0.2206,0.2222,0.2237,0.2253,0.2269,0.2284,0.23,0.2316,0.2332,0.2348,0.2363,0.2379,0.2395,0.2412,0.2428,0.2444,0.246,0.2476,0.2493,0.2509,0.2525,0.2542,0.2558,0.2575,0.2591,0.2608,0.2625,0.2641,0.2658,0.2675,0.2692,0.2708,0.2725,0.2742,0.2759,0.2776,0.2793,0.281,0.2828,0.2845,0.2862,0.2879,0.2897,0.2914,0.2931,0.2949,0.2966,0.2984,0.3001,0.3019,0.3036,0.3054,0.3072,0.3089,0.3107,0.3125,0.3143,0.316,0.3178,0.3196,0.3214,0.3232,0.325,0.3268,0.3286,0.3304,0.3322,0.3341,0.3359,0.3377,0.3395,0.3413,0.3432,0.345,0.3468,0.3487,0.3505,0.3524,0.3542,0.3561,0.3579,0.3598,0.3616,0.3635,0.3654,0.3672,0.3691,0.371,0.3728,0.3747,0.3766,0.3785,0.3804,0.3822,0.3841,0.386,0.3879,0.3898,0.3917,0.3936,0.3955,0.3974,0.3993,0.4012,0.4031,0.405,0.4069,0.4088,0.4108,0.4127,0.4146,0.4165,0.4184,0.4203,0.4223,0.4242,0.4261,0.428,0.43,0.4319,0.4338,0.4358,0.4377,0.4396,0.4416,0.4435,0.4454,0.4474,0.4493,0.4513,0.4532,0.4552,0.4571,0.459,0.461,0.4629,0.4649,0.4668,0.4688,0.4707,0.4727,0.4746,0.4766,0.4785,0.4805,0.4824,0.4844,0.4863,0.4883,0.4902,0.4922,0.4941,0.4961,0.498,0.5,0.502,0.5039,0.5059,0.5078,0.5098,0.5117,0.5137,0.5156,0.5176,0.5195,0.5215,0.5234,0.5254,0.5273,0.5293,0.5312,0.5332,0.5351,0.5371,0.539,0.541,0.5429,0.5448,0.5468,0.5487,0.5507,0.5526,0.5546,0.5565,0.5584,0.5604,0.5623,0.5642,0.5662,0.5681,0.57,0.572,0.5739,0.5758,0.5777,0.5797,0.5816,0.5835,0.5854,0.5873,0.5892,0.5912,0.5931,0.595,0.5969,0.5988,0.6007,0.6026,0.6045,0.6064,0.6083,0.6102,0.6121,0.614,0.6159,0.6178,0.6196,0.6215,0.6234,0.6253,0.6272,0.629,0.6309,0.6328,0.6346,0.6365,0.6384,0.6402,0.6421,0.6439,0.6458,0.6476,0.6495,0.6513,0.6532,0.655,0.6568,0.6587,0.6605,0.6623,0.6641,0.6659,0.6678,0.6696,0.6714,0.6732,0.675,0.6768,0.6786,0.6804,0.6822,0.684,0.6857,0.6875,0.6893,0.6911,0.6928,0.6946,0.6964,0.6981,0.6999,0.7016,0.7034,0.7051,0.7069,0.7086,0.7103,0.7121,0.7138,0.7155,0.7172,0.719,0.7207,0.7224,0.7241,0.7258,0.7275,0.7292,0.7308,0.7325,0.7342,0.7359,0.7375,0.7392,0.7409,0.7425,0.7442,0.7458,0.7475,0.7491,0.7507,0.7524,0.754,0.7556,0.7572,0.7588,0.7605,0.7621,0.7637,0.7652,0.7668,0.7684,0.77,0.7716,0.7731,0.7747,0.7763,0.7778,0.7794,0.7809,0.7825,0.784,0.7855,0.7871,0.7886,0.7901,0.7916,0.7931,0.7946,0.7961,0.7976,0.7991,0.8006,0.8021,0.8035,0.805,0.8064,0.8079,0.8094,0.8108,0.8122,0.8137,0.8151,0.8165,0.8179,0.8194,0.8208,0.8222,0.8236,0.825,0.8263,0.8277,0.8291,0.8305,0.8318,0.8332,0.8345,0.8359,0.8372,0.8386,0.8399,0.8412,0.8425,0.8439,0.8452,0.8465,0.8478,0.8491,0.8503,0.8516,0.8529,0.8542,0.8554,0.8567,0.8579,0.8592,0.8604,0.8617,0.8629,0.8641,0.8653,0.8665,0.8677,0.8689,0.8701,0.8713,0.8725,0.8737,0.8748,0.876,0.8772,0.8783,0.8795,0.8806,0.8817,0.8829,0.884,0.8851,0.8862,0.8873,0.8884,0.8895,0.8906,0.8917,0.8928,0.8938,0.8949,0.896,0.897,0.8981,0.8991,0.9001,0.9012,0.9022,0.9032,0.9042,0.9052,0.9062,0.9072,0.9082,0.9092,0.9101,0.9111,0.9121,0.913,0.914,0.9149,0.9158,0.9168,0.9177,0.9186,0.9195,0.9204,0.9213,0.9222,0.9231,0.924,0.9249,0.9258,0.9266,0.9275,0.9283,0.9292,0.93,0.9309,0.9317,0.9325,0.9333,0.9342,0.935,0.9358,0.9366,0.9373,0.9381,0.9389,0.9397,0.9404,0.9412,0.942,0.9427,0.9434,0.9442,0.9449,0.9456,0.9464,0.9471,0.9478,0.9485,0.9492,0.9499,0.9506,0.9512,0.9519,0.9526,0.9532,0.9539,0.9545,0.9552,0.9558,0.9565,0.9571,0.9577,0.9583,0.9589,0.9595,0.9601,0.9607,0.9613,0.9619,0.9625,0.9631,0.9636,0.9642,0.9647,0.9653,0.9658,0.9664,0.9669,0.9674,0.968,0.9685,0.969,0.9695,0.97,0.9705,0.971,0.9715,0.972,0.9724,0.9729,0.9734,0.9738,0.9743,0.9748,0.9752,0.9756,0.9761,0.9765,0.9769,0.9774,0.9778,0.9782,0.9786,0.979,0.9794,0.9798,0.9802,0.9806,0.9809,0.9813,0.9817,0.982,0.9824,0.9828,0.9831,0.9835,0.9838,0.9841,0.9845,0.9848,0.9851,0.9854,0.9857,0.9861,0.9864,0.9867,0.987,0.9873,0.9875,0.9878,0.9881,0.9884,0.9887,0.9889,0.9892,0.9894,0.9897,0.9899,0.9902,0.9904,0.9907,0.9909,0.9911,0.9914,0.9916,0.9918,0.992,0.9922,0.9924,0.9927,0.9929,0.9931,0.9932,0.9934,0.9936,0.9938,0.994,0.9942,0.9943,0.9945,0.9947,0.9948,0.995,0.9952,0.9953,0.9955,0.9956,0.9957,0.9959,0.996,0.9962,0.9963,0.9964,0.9965,0.9967,0.9968,0.9969,0.997,0.9971,0.9972,0.9973,0.9974,0.9975,0.9976,0.9977,0.9978,0.9979,0.998,0.9981,0.9982,0.9983,0.9983,0.9984,0.9985,0.9986,0.9986,0.9987,0.9987,0.9988,0.9989,0.9989,0.999,0.999,0.9991,0.9991,0.9992,0.9992,0.9993,0.9993,0.9994,0.9994,0.9994,0.9995,0.9995,0.9995,0.9996,0.9996,0.9996,0.9997,0.9997,0.9997,0.9997,0.9998,0.9998,0.9998,0.9998,0.9998,0.9999,0.9999,0.9999,0.9999,0.9999,0.9999,0.9999,0.9999,0.9999,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];

function Planner()
{
}

Planner.prototype =
{
  generate: function(plan)
  {
    let motion = [];
    const period = plan.cycle;
    let start = plan.start;
    plan.steps.forEach((step) =>
    {
      const end = step.end;
      const distance = end - start;
      const func = step.func || Planner.ease_inout;
      const ticks = (step.time || 0) / period;
      if (ticks === 0)
      {
        motion.push(start + distance);
      }
      else
      {
        for (let t = 0; t <= ticks; t++)
        {
          motion.push(func(start, distance, t / ticks));
        }
      }
      start = end;
    });

    return Float32Array.from(motion);
  },

  execute: function(motion, period, stepFn, doneFn)
  {
    let timer = null;
    let idx = 0;
    const run = () => {
      stepFn(motion[idx++]);
      if (idx >= motion.length)
      {
        clearInterval(timer);
        doneFn();
      }
    }
    run();
    if (idx < motion.length)
    {
      timer = setInterval(run, period);
    }
  }
}

Planner.linear = function(start, distance, idx)
{
  return start + distance * idx;
}

Planner.ease_inout = function(start, distance, idx)
{
  return start + distance * scurve[Math.round(idx * 1023)];
}

Planner.ease_out = function(start, distance, idx)
{
  return start + distance * scurve[Math.round(idx * 512)] / 0.5;
}

Planner.ease_in = function(start, distance, idx)
{
  return start + distance * (scurve[Math.round(512 + idx * 511)] - 0.5) / 0.5;
},

Planner.wait = function(start, distance, idx)
{
  return start;
}

module.exports = Planner;
