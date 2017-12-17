#include <unistd.h>
#include <node.h>
#include <uv.h>
#if defined(linux)
extern "C"
{
#include <roboticscape.h>
}
#else
// Mocks
typedef int rc_pin_direction_t;
typedef int rc_pin_edge_t;
inline int rc_gpio_export(int pin) { return 0; }
inline int rc_gpio_get_value_mmap(int pin) { return 0; }
inline int rc_gpio_set_value_mmap(int pin, int value) { return 0; }
inline int rc_gpio_set_dir(int pin, rc_pin_direction_t dir) { return 0; }
inline int rc_gpio_fd_open(int pin) { return 0; }
inline int rc_gpio_set_edge(int pin, rc_pin_edge_t edge) { return 0; }
#endif

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::Integer;
using v8::Number;
using v8::Boolean;
using v8::Value;
using v8::Persistent;
using v8::Function;
using v8::Handle;
using v8::Context;
using v8::HandleScope;
using v8::Null;

#define CONFIG_NR_DEVICES 6

namespace BBBlueGpio {

static struct GpioCallback
{
  uv_poll_t handle;
  Persistent<Function> callback;
} GpioCallbacks[CONFIG_NR_DEVICES];
static uint32_t GpioPins[CONFIG_NR_DEVICES] = { 57, 49, 116, 113, 98, 97 }; // GP0:3-6, GP1:3-4

void JS_create(const FunctionCallbackInfo<Value>& args)
{
  rc_gpio_export(GpioPins[args[0]->Int32Value()]);
}

void JS_getValue(const FunctionCallbackInfo<Value>& args)
{
  uint32_t pin = GpioPins[args[0]->Int32Value()];
  args.GetReturnValue().Set(Number::New(args.GetIsolate(), rc_gpio_get_value_mmap(pin)));
}

void JS_setValue(const FunctionCallbackInfo<Value>& args)
{
  uint32_t pin = GpioPins[args[0]->Int32Value()];
  int32_t value = args[1]->Int32Value();
  rc_gpio_set_value_mmap(pin, value);
}

void JS_setDir(const FunctionCallbackInfo<Value>& args)
{
  uint32_t pin = GpioPins[args[0]->Int32Value()];
  rc_pin_direction_t dir = (rc_pin_direction_t)args[1]->Int32Value();
  rc_gpio_set_dir(pin, dir);
}

static void onEdgeHandler(uv_poll_t* handle, int status, int events)
{
  for (int i = 0; i < CONFIG_NR_DEVICES; i++)
  {
    if (&GpioCallbacks[i].handle == handle)
    {
      // Found
      Isolate* isolate = Isolate::GetCurrent();
      HandleScope scope(isolate);
      Local<Function> cb = Local<Function>::New(isolate, GpioCallbacks[i].callback);
      Handle<Value> argv[] =
      {
          Handle<Value>(Integer::New(isolate, rc_gpio_get_value_mmap(GpioPins[i])))
      };
      cb->Call(Null(isolate), 1, argv);
      break;
    }
  }
}

void JS_onEdge(const FunctionCallbackInfo<Value>& args)
{
  struct GpioCallback* gpio = &GpioCallbacks[args[0]->Int32Value()];
  if (gpio->handle.poll_cb == NULL)
  {
    uint32_t pin = GpioPins[args[0]->Int32Value()];
    rc_gpio_set_edge(pin, (rc_pin_edge_t)args[1]->Int32Value());
    int fd = rc_gpio_fd_open(pin);
    uv_poll_init(uv_default_loop(), &gpio->handle, fd);
    uv_poll_start(&gpio->handle, UV_READABLE, onEdgeHandler);
  }
  gpio->callback.Reset(args.GetIsolate(), Handle<Function>::Cast(args[2]));
}

}

