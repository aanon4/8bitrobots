#include <unistd.h>
#include <node.h>
#include <uv.h>
#include <memory.h>
#include <time.h>
#include <fcntl.h>
#include <uv.h>
#include <sys/file.h>
#include <sys/uio.h>
#include <sys/ioctl.h>
#if !defined(linux)
// Mocks
inline void clock_gettime(int t, struct timespec* ts) {}
#endif

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::Integer;
using v8::Boolean;
using v8::Value;
using v8::Float32Array;
using v8::Persistent;
using v8::Function;
using v8::Handle;
using v8::Context;
using v8::HandleScope;
using v8::Null;


#define CONFIG_NR_DEVICES     MOTION_NR_DEVICES
#define CONFIG_NR_SUBDEVICES  MOTION_NR_SUBDEVICES

enum Error 
{
  ERROR_NO_DEVICES = -1
};

enum State
{
  DISABLED = 0,
  STOPPED,
  MOVING
};

namespace MOTION_NAMESPACE
{

static struct MotionDevice
{
  struct SubDevice
  {
    enum State state;
    float* plan;
    size_t planLength;
    Persistent<Function> jscallback;
    size_t index;
    float current;
    int64_t startTime;
    Isolate* isolate;
  } subdevice[CONFIG_NR_SUBDEVICES];
  uint8_t running;
  uint64_t cyclePeriod;
  uv_mutex_t lock;
  uv_async_t callback;
} motionDevices[CONFIG_NR_DEVICES];
static uint32_t nextHandle = 0;
static int running = 0;


static uint8_t step(struct MotionDevice* device)
{
  uv_mutex_lock(&device->lock);

  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  int64_t now = (ts.tv_sec * 1000000LL) + (ts.tv_nsec / 1000LL);
  bool callbacks = false;
  uint8_t inactive = 0;

  actions_begin(motionDevices - device);

  for (uint32_t s = 0; s < CONFIG_NR_SUBDEVICES; s++)
  {
    struct MotionDevice::SubDevice* subdevice = &device->subdevice[s];
    if (subdevice->state == MOVING)
    {
      size_t index = (now - subdevice->startTime) / device->cyclePeriod;
      if (index >= subdevice->planLength - 1)
      {
        index = subdevice->planLength - 1;
        callbacks = true;
      }
      subdevice->index = index;
      subdevice->current = subdevice->plan[index];
      action(motionDevices - device, s, subdevice->current);
    }
    else if (subdevice->state == STOPPED)
    {
      action(motionDevices - device, s, subdevice->current);
    }
    else if (subdevice->state == DISABLED)
    {
      inactive++;
    }
  }

  actions_end(motionDevices - device);

  uv_mutex_unlock(&device->lock);

  if (callbacks)
  {
    uv_async_send(&device->callback);
  }

  return CONFIG_NR_SUBDEVICES - inactive;
}

static void run(void* dev)
{
  struct MotionDevice* device = (struct MotionDevice*)dev;
  for (;;)
  {
    uint8_t active = step(device);
    if (active == 0 && !device->running)
    {
      break;
    }
    struct timespec delay = { 0, (long)device->cyclePeriod * 1000L };
    nanosleep(&delay, NULL);
  }
  running--;
}

static void docallback(uv_async_s* callback)
{
  for (uint32_t d = 0; d < CONFIG_NR_DEVICES; d++)
  {
    struct MotionDevice* device = &motionDevices[d];
    for (uint32_t s = 0; s < CONFIG_NR_SUBDEVICES; s++)
    {
      struct MotionDevice::SubDevice* subdevice = &device->subdevice[s];
      if (subdevice->state == MOVING && subdevice->index + 1 == subdevice->planLength)
      {
        HandleScope scope(subdevice->isolate);
        subdevice->state = STOPPED;
        delete subdevice->plan;
        subdevice->plan = NULL;
        subdevice->planLength = 0;
        Local<Function> cb = Local<Function>::New(subdevice->isolate, subdevice->jscallback);
        Handle<Value> argv[] = {};
        cb->Call(Null(subdevice->isolate), 0, argv);
      }
    }
  }
}

void JS_create(const FunctionCallbackInfo<Value>& args)
{
  if (nextHandle >= CONFIG_NR_DEVICES)
  {
    args.GetReturnValue().Set(Integer::New(args.GetIsolate(), ERROR_NO_DEVICES));
    return;
  }

  struct MotionDevice* device = &motionDevices[nextHandle];
  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), nextHandle));
  nextHandle++;

  uv_mutex_init(&device->lock);
  uv_async_init(uv_default_loop(), &device->callback, docallback);

  // 40ms/25Hz default period
  device->cyclePeriod = 40 * 1000;

  create_native(device - motionDevices, &args);
}

void JS_setPlan(const FunctionCallbackInfo<Value>& args)
{
  struct MotionDevice* device = &motionDevices[args[0]->Int32Value()];
  struct MotionDevice::SubDevice* subdevice = &device->subdevice[args[1]->Int32Value()];

  uv_mutex_lock(&device->lock);

  switch (subdevice->state)
  {
    case DISABLED:
      break;

    case STOPPED:
    {
      subdevice->state = MOVING;
      subdevice->index = 0;
      subdevice->isolate = args.GetIsolate();
      Handle<Float32Array> plan = Handle<Float32Array>::Cast(args[2]);
      subdevice->plan = static_cast<float*>(plan->Buffer()->Externalize().Data());
      subdevice->planLength = plan->Length();
      subdevice->current = subdevice->plan[0];
      subdevice->jscallback.Reset(subdevice->isolate, Handle<Function>::Cast(args[3]));
      struct timespec ts;
      clock_gettime(CLOCK_MONOTONIC, &ts);
      subdevice->startTime = (ts.tv_sec * 1000000LL) + (ts.tv_nsec / 1000LL);
      break;
    }
    case MOVING:
    default:
      break;
  }

  uv_mutex_unlock(&device->lock);
}

void JS_getCurrentIndex(const FunctionCallbackInfo<Value>& args)
{
  struct MotionDevice* device = &motionDevices[args[0]->Int32Value()];
  struct MotionDevice::SubDevice* subdevice = &device->subdevice[args[1]->Int32Value()];

  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), subdevice->index));
}

void JS_enable(const FunctionCallbackInfo<Value>& args)
{
  struct MotionDevice* device = &motionDevices[args[0]->Int32Value()];
  struct MotionDevice::SubDevice* subdevice = &device->subdevice[args[1]->Int32Value()];

  uv_mutex_lock(&device->lock);

  switch (subdevice->state)
  {
    case DISABLED:
      subdevice->state = STOPPED;
      break;
    case STOPPED:
    case MOVING:
    default:
      break;
  }

  uv_mutex_unlock(&device->lock);
}

static void disable_subdevice(int dev, int sub)
{
  struct MotionDevice* device = &motionDevices[dev];
  struct MotionDevice::SubDevice* subdevice = &device->subdevice[sub];

  uv_mutex_lock(&device->lock);

  switch (subdevice->state)
  {
    case DISABLED:
      break;
    case STOPPED:
    case MOVING:
    default: 
      subdevice->state = DISABLED;
      break;
  }

  uv_mutex_unlock(&device->lock);
}

void JS_disable(const FunctionCallbackInfo<Value>& args)
{
  disable_subdevice(args[0]->Int32Value(), args[1]->Int32Value());
}

void JS_setCyclePeriod(const FunctionCallbackInfo<Value>& args)
{
  struct MotionDevice* device = &motionDevices[args[0]->Int32Value()];

  uv_mutex_lock(&device->lock);

  double cycleMs = args[1]->NumberValue();
  device->cyclePeriod = (uint64_t)(cycleMs * 1000LL);

  cycleperiod_native(device - motionDevices, cycleMs);

  uv_mutex_unlock(&device->lock);
}

void JS_start(const FunctionCallbackInfo<Value>& args)
{
  struct MotionDevice* device = &motionDevices[args[0]->Int32Value()];
  running++;
  device->running = 1;

  uv_thread_t tid;
  uv_thread_create(&tid, &run, device);
}

void JS_stop(const FunctionCallbackInfo<Value>& args)
{
  struct MotionDevice* device = &motionDevices[args[0]->Int32Value()];

  uv_mutex_lock(&device->lock);

  device->running = 0;
  
  uv_mutex_unlock(&device->lock);
}

void shutdown(void)
{
  for (uint32_t i = 0; i < nextHandle; i++)
  {
    motionDevices[i].running = 0;
    for (uint32_t s = 0; s < CONFIG_NR_SUBDEVICES; s++)
    {
      disable_subdevice(i, s);
    }
  }
  while (running)
  {
    usleep(1000);
  }
  deinit();
}

}
