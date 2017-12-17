#include <unistd.h>
#include <node.h>
#include <memory.h>
#include <time.h>
#include <fcntl.h>
#include <uv.h>
#include <sys/file.h>
#include <sys/uio.h>
#include <sys/ioctl.h>
#if defined(linux)
#include <linux/i2c-dev.h>
#else
// Mocks
#define I2C_SLAVE 0
#define clock_gettime(A, B) { time_t t; time(&t); (B)->tv_sec = t; (B)->tv_nsec = 0; }
#endif
#include "i2c-lock.h"
#include "i2c-switch.h"

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::Integer;
using v8::Boolean;
using v8::Value;


#define CONFIG_NR_DEVICES     4

#define CONFIG_MODE1          0x20 // NORESTART, INTCLK, AUTOINC, NOSLEEP, NOSUB1, NOSUB2, NOSUB3, NOALLCALL
#define CONFIG_MODE2          0x04 // ONSTOP, NOOPENDRAIN, OUTENABLE
#define CONFIG_SLEEP_BIT      0x10
#define CONFIG_PRESCALER      0xFF

#define CONFIG_NR_SUBDEVICES  16

enum Error 
{
  ERROR_NO_DEVICES = -1
};

enum State
{
  RESET = 1,
  ENABLED,
  STOPPED,
  STOPPED_PENDING,
  STOPPED_PENDING_DISABLED,
  MOVING,
  MOVING_DISABLED,
  MOVING_PENDING,
  MOVING_PENDING_DISABLED,
  DISABLED
};

namespace PwmScurvePca9685 {

#define CONFIG_SCURVE_SIZE  100
static const uint32_t scurve[CONFIG_SCURVE_SIZE] = { 0,0,0,0,0,0,0,1,1,1,2,2,3,4,4,5,7,8,9,11,12,14,16,18,21,23,26,29,32,35,38,41,45,49,53,57,61,65,69,74,78,83,88,93,98,103,108,113,118,123,128,133,138,143,148,153,158,163,168,173,178,182,187,191,195,199,203,207,211,215,218,221,224,227,230,233,235,238,240,242,244,245,247,248,249,251,252,252,253,254,254,255,255,255,256,256,256,256,256,256 };
static const uint32_t linear[CONFIG_SCURVE_SIZE] = { 0,2,5,7,10,12,15,18,20,23,25,28,31,33,36,38,41,43,46,49,51,54,56,59,62,64,67,69,72,74,77,80,82,85,87,90,93,95,98,100,103,106,108,111,113,116,118,121,124,126,129,131,134,137,139,142,144,147,149,152,155,157,160,162,165,168,170,173,175,178,181,183,186,188,191,193,196,199,201,204,206,209,212,214,217,219,222,224,227,230,232,235,237,240,243,245,248,250,253,256 };
static const uint32_t direction[CONFIG_SCURVE_SIZE] = { 256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256,256 };

static struct Device
{
  uint8_t   i2cBus;
  uint8_t   i2cAddress;
  uint8_t   subaddress;
  uint8_t   values[CONFIG_NR_SUBDEVICES][4];
  struct SubDevice
  {
    enum State state;
    int32_t start;
    int32_t end;
    int32_t diff;
    int32_t current;
    int64_t startTime;
    uint32_t periodPerStep;
    const uint32_t* curve;
    struct
    {
      int32_t end;
      uint32_t periodPerStep;
    } pending;
  } subdevice[CONFIG_NR_SUBDEVICES];
  uint8_t running;
  uint8_t retry;
  uint32_t cyclePeriod;
  uv_mutex_t lock;
} pca9685[CONFIG_NR_DEVICES];
static uint32_t nextHandle = 0;
static int i2c = -1;
static int running = 0;


static uint8_t step(struct Device* device)
{
  uint8_t inactive = 0;
  uint8_t change = device->retry;
  int64_t now;
  struct timespec ts;

  uv_mutex_lock(&device->lock);

  clock_gettime(CLOCK_MONOTONIC, &ts);
  now = (ts.tv_sec * 1000LL) + (ts.tv_nsec / 1000000LL);
  device->retry = 0;

  for (uint32_t s = 0; s < CONFIG_NR_SUBDEVICES; s++)
  {
    struct Device::SubDevice* subdevice = &device->subdevice[s];
    switch (subdevice->state)
    {
      case RESET:
      case DISABLED:
        inactive++;
        break;
      case ENABLED:
      case STOPPED:
        // Nothing to do
        break;

      case STOPPED_PENDING:
      case STOPPED_PENDING_DISABLED:
        // Start MOVING
        subdevice->state = (subdevice->state == STOPPED_PENDING ? MOVING : MOVING_DISABLED);
        subdevice->startTime = now;
        subdevice->start = subdevice->current;
        subdevice->end = subdevice->pending.end;
        subdevice->diff = subdevice->end - subdevice->start;
        subdevice->periodPerStep = subdevice->pending.periodPerStep;
        subdevice->pending.end = -1;
        subdevice->pending.periodPerStep = -1;
        // Not moving - stopped
        if (subdevice->diff == 0)
        {
          subdevice->state = (subdevice->state == MOVING ? STOPPED : DISABLED);
          break;
        }
        // Moving instantly? Craft the startTime and periodPerStep to instantly get us to the end of the curve.
        if (subdevice->periodPerStep == 0)
        {
          subdevice->periodPerStep = 1;
          subdevice->startTime -= CONFIG_SCURVE_SIZE;
        }
        // Fall through

      case MOVING:
      case MOVING_DISABLED:
      case MOVING_PENDING:
      case MOVING_PENDING_DISABLED:
      {
        uint32_t step = (now - subdevice->startTime) / subdevice->periodPerStep;
        if (step >= CONFIG_SCURVE_SIZE - 1)
        {
          subdevice->current = subdevice->end;
          switch (subdevice->state)
          {
            case MOVING:
              subdevice->state = STOPPED;
              break;
            case MOVING_PENDING:
              subdevice->state = STOPPED_PENDING;
              break;
            case MOVING_DISABLED:
              subdevice->state = DISABLED;
              break;
            case MOVING_PENDING_DISABLED:
              subdevice->state = STOPPED_PENDING_DISABLED;
              break;
            default:
              break;
          }
        }
        else
        {
          subdevice->current = subdevice->start + ((int32_t)((subdevice->curve[step] * subdevice->diff)) >> 8);
        }
        uint8_t pulsel = (uint8_t)subdevice->current;
        uint8_t pulseh = (uint8_t)(subdevice->current >> 8);
        if (device->values[s][2] != pulsel || device->values[s][3] != pulseh)
        {
          device->values[s][2] = pulsel;
          device->values[s][3] = pulseh;
          change = 1;
        }
        break;
      }
      default:
        break;
    }
  }

  // If any PWMs were changed, commit the current state to the hw device
  if (change)
  {
    I2CLock::lock();
    i2c_Switch_SetChannel(device->i2cBus);
    ioctl(i2c, I2C_SLAVE, device->i2cAddress);
    if (write(i2c, &device->subaddress, 1 + CONFIG_NR_SUBDEVICES * 4) != 1 + CONFIG_NR_SUBDEVICES * 4)
    {
      // Failed. We will retry.
      device->retry = 1;
    }
    I2CLock::unlock();
  }

  uv_mutex_unlock(&device->lock);

  return CONFIG_NR_SUBDEVICES - inactive;
}

static void run(void* device)
{
  for (;;)
  {
    uint8_t active = step((struct Device*)device);
    if (active == 0 && !((struct Device*)device)->running)
    {
      break;
    }
    struct timespec delay = { 0, ((long)((struct Device*)device)->cyclePeriod) * 1000 };
    nanosleep(&delay, NULL);
  }
  I2CLock::lock();
  i2c_Switch_SetChannel(((struct Device*)device)->i2cBus);
  ioctl(i2c, I2C_SLAVE, ((struct Device*)device)->i2cAddress);
  write(i2c, &((struct Device*)device)->subaddress, 1 + CONFIG_NR_SUBDEVICES * 4);
  I2CLock::unlock();
  running--;
}

void JS_create(const FunctionCallbackInfo<Value>& args)
{
  if (nextHandle >= CONFIG_NR_DEVICES)
  {
    args.GetReturnValue().Set(Integer::New(args.GetIsolate(), ERROR_NO_DEVICES));
    return;
  }

  struct Device* device = &pca9685[nextHandle];
  device->i2cBus = 0;
  device->i2cAddress = args[0]->Int32Value();
  device->subaddress = 6;
  for (int i = 0; i < CONFIG_NR_SUBDEVICES; i++)
  {
    device->subdevice[i].state = RESET;
    device->subdevice[i].start = -1;
    device->subdevice[i].end = -1;
    device->subdevice[i].current = -1;
    device->subdevice[i].curve = scurve;
    device->subdevice[i].pending.end = -1;
    device->subdevice[i].startTime = -1;
  }
  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), nextHandle));
  nextHandle++;

  if (nextHandle == 1)
  {
    i2c = open("/dev/i2c-1", O_RDWR);
#if defined(linux)
    assert(i2c != -1);
#endif
  }

  // 40ms/25Hz default period
  device->cyclePeriod = 40 * 1000;

  uv_mutex_init(&device->lock);

  // Configure hw device
  I2CLock::lock();
  i2c_Switch_SetChannel(device->i2cBus);
  ioctl(i2c, I2C_SLAVE, device->i2cAddress);
  uint8_t cmd0[] = { 0x00, CONFIG_MODE1 };
  write(i2c, cmd0, sizeof(cmd0));
  uint8_t cmd1[] = { 0x01, CONFIG_MODE2 };
  write(i2c, cmd1, sizeof(cmd1));
  uint8_t cmd2[] = { 0xFE, CONFIG_PRESCALER };
  write(i2c, cmd2, sizeof(cmd2));
  I2CLock::unlock();
}

void JS_setPulse(const FunctionCallbackInfo<Value>& args)
{
  struct Device* device = &pca9685[args[0]->Int32Value()];
  struct Device::SubDevice* subdevice = &device->subdevice[args[1]->Int32Value()];

  uv_mutex_lock(&device->lock);

  int32_t pulse = args[2]->Int32Value();
  if (subdevice->end == pulse)
  {
    if (subdevice->state == ENABLED)
    {
      subdevice->state = STOPPED;
    }
    // Nothing to change
    uv_mutex_unlock(&device->lock);
    return;
  }
  switch (subdevice->state)
  {
    case RESET:
    case DISABLED:
    case MOVING_DISABLED:
    case MOVING_PENDING_DISABLED:
    case STOPPED_PENDING_DISABLED:
      break;

    case ENABLED:
      subdevice->state = STOPPED_PENDING;
      subdevice->pending.end = pulse;
      subdevice->pending.periodPerStep = 0; // Instant, because we have no starting place
      break;

    case STOPPED:
    case STOPPED_PENDING:
      subdevice->state = STOPPED_PENDING;
      subdevice->pending.end = pulse;
      subdevice->pending.periodPerStep = args[3]->Int32Value() / CONFIG_SCURVE_SIZE;
      break;

    case MOVING:
      if (subdevice->curve != scurve)
      {
        subdevice->state = STOPPED_PENDING;
      }
      else
      {
        subdevice->state = MOVING_PENDING;
      }
      subdevice->pending.end = pulse;
      subdevice->pending.periodPerStep = args[3]->Int32Value() / CONFIG_SCURVE_SIZE;
      break;

    case MOVING_PENDING:
      subdevice->state = MOVING_PENDING;
      subdevice->pending.end = pulse;
      subdevice->pending.periodPerStep = args[3]->Int32Value() / CONFIG_SCURVE_SIZE;
      break;

    default:
      // Cannot happen.
      break;
  }

  uv_mutex_unlock(&device->lock);
}

void JS_getCurrentPulse(const FunctionCallbackInfo<Value>& args)
{
  struct Device::SubDevice* subdevice = &pca9685[args[0]->Int32Value()].subdevice[args[1]->Int32Value()];
  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), subdevice->current));
}

void JS_setCurve(const FunctionCallbackInfo<Value>& args)
{
  switch (args[2]->Int32Value())
  {
    case 0:
      pca9685[args[0]->Int32Value()].subdevice[args[1]->Int32Value()].curve = scurve;
      break;
    
    default:
    case 1:
      pca9685[args[0]->Int32Value()].subdevice[args[1]->Int32Value()].curve = linear;
      break;
 
    case 2:
      pca9685[args[0]->Int32Value()].subdevice[args[1]->Int32Value()].curve = direction;
      pca9685[args[0]->Int32Value()].subdevice[args[1]->Int32Value()].start = 0;
      break;
  }
}

void JS_enable(const FunctionCallbackInfo<Value>& args)
{
  struct Device* device = &pca9685[args[0]->Int32Value()];
  struct Device::SubDevice* subdevice = &device->subdevice[args[1]->Int32Value()];

  uv_mutex_lock(&device->lock);

  if (subdevice->state == DISABLED || subdevice->state == RESET)
  {
    subdevice->state = ENABLED;
    args.GetReturnValue().Set(Boolean::New(args.GetIsolate(), true));
  }
  else
  {
    args.GetReturnValue().Set(Boolean::New(args.GetIsolate(), false));
  }

  uv_mutex_unlock(&device->lock);
}

void JS_disable(const FunctionCallbackInfo<Value>& args)
{
  struct Device* device = &pca9685[args[0]->Int32Value()];
  struct Device::SubDevice* subdevice = &device->subdevice[args[1]->Int32Value()];
  
  uv_mutex_lock(&device->lock);

  switch (subdevice->state)
  {
    case MOVING:
      subdevice->state = MOVING_DISABLED;
      break;
    case MOVING_PENDING:
      subdevice->state = MOVING_PENDING_DISABLED;
      break;
    case STOPPED_PENDING:
      subdevice->state = STOPPED_PENDING_DISABLED;
      break;
    case MOVING_DISABLED:
    case MOVING_PENDING_DISABLED:
    case STOPPED_PENDING_DISABLED:
    case DISABLED:
      break;
    case RESET:
    case ENABLED:
    case STOPPED:
    default: 
      subdevice->state = DISABLED;
      break;
  }

  uv_mutex_unlock(&device->lock);
}

void JS_isChanging(const FunctionCallbackInfo<Value>& args)
{
  struct Device* device = &pca9685[args[0]->Int32Value()];
  struct Device::SubDevice* subdevice = &device->subdevice[args[1]->Int32Value()];

  uv_mutex_lock(&device->lock);

  switch (subdevice->state)
  {
    case MOVING:
    case MOVING_DISABLED:
    case MOVING_PENDING:
    case MOVING_PENDING_DISABLED:
    case STOPPED_PENDING:
    case STOPPED_PENDING_DISABLED:
      args.GetReturnValue().Set(Boolean::New(args.GetIsolate(), true));
      break;
    case RESET:
    case ENABLED:
    case STOPPED:
    case DISABLED:
    default:
      args.GetReturnValue().Set(Boolean::New(args.GetIsolate(), false));
      break;
  }

  uv_mutex_unlock(&device->lock);
}

void JS_setCyclePeriod(const FunctionCallbackInfo<Value>& args)
{
  struct Device* device = &pca9685[args[0]->Int32Value()];

  uv_mutex_lock(&device->lock);

  double cycleMs = args[1]->NumberValue();
  device->cyclePeriod = (uint32_t)(cycleMs * 1000);

  uv_mutex_unlock(&device->lock);

  uint8_t prescaler = (25 * 1000 * 1000 * cycleMs) / (4096 * 1000) - 1;

  // Configure hw device
  I2CLock::lock();
  i2c_Switch_SetChannel(device->i2cBus);
  ioctl(i2c, I2C_SLAVE, device->i2cAddress);
  uint8_t cmd0[] = { 0x00, CONFIG_MODE1 | CONFIG_SLEEP_BIT };
  write(i2c, cmd0, sizeof(cmd0));
  uint8_t cmd1[] = { 0xFE, prescaler };
  write(i2c, cmd1, sizeof(cmd1));
  uint8_t cmd2[] = { 0x00, CONFIG_MODE1 };
  write(i2c, cmd2, sizeof(cmd2));
  I2CLock::unlock();
}

void JS_start(const FunctionCallbackInfo<Value>& args)
{
  running++;
  pca9685[args[0]->Int32Value()].running = 1;

  uv_thread_t tid;
  uv_thread_create(&tid, &run, &pca9685[args[0]->Int32Value()]);
}

void JS_stop(const FunctionCallbackInfo<Value>& args)
{
  struct Device* device = &pca9685[args[0]->Int32Value()];

  uv_mutex_lock(&device->lock);

  pca9685[args[0]->Int32Value()].running = 0;

  uv_mutex_unlock(&device->lock);
}

void JS_shutdown(const FunctionCallbackInfo<Value>& args)
{
  for (uint32_t i = 0; i < nextHandle; i++)
  {
    pca9685[i].running = 0;
  }
  while (running)
  {
    usleep(1000);
  }
}

}
