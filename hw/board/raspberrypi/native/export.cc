#include <node.h>

using v8::FunctionCallbackInfo;
using v8::Value;
using v8::Local;
using v8::Object;

namespace I2CLock
{
  extern void init(void);
  extern void JS_lock(const FunctionCallbackInfo<Value>& args);
}

namespace I2CSwitchPca9548A
{
  extern void JS_create(const FunctionCallbackInfo<Value>& args);
  extern void JS_setChannel(const FunctionCallbackInfo<Value>& args);
}

namespace PwmScurvePca9685
{
  extern void init(void);
  extern void shutdown(void);
  extern void JS_create(const FunctionCallbackInfo<Value>& args);
  extern void JS_setPlan(const FunctionCallbackInfo<Value>& args);
  extern void JS_getCurrentIndex(const FunctionCallbackInfo<Value>& args);
  extern void JS_enable(const FunctionCallbackInfo<Value>& args);
  extern void JS_disable(const FunctionCallbackInfo<Value>& args);
  extern void JS_setCyclePeriod(const FunctionCallbackInfo<Value>& args);
  extern void JS_start(const FunctionCallbackInfo<Value>& args);
  extern void JS_stop(const FunctionCallbackInfo<Value>& args);
}

static void startup(void)
{
  I2CLock::init();
  PwmScurvePca9685::init();
}

static void shutdown(const FunctionCallbackInfo<Value>& args)
{
  PwmScurvePca9685::shutdown();
}

void init(Local<Object> exports)
{
  startup();

  NODE_SET_METHOD(exports, "i2clock_lock", I2CLock::JS_lock);
  
  NODE_SET_METHOD(exports, "pca9548a_create", I2CSwitchPca9548A::JS_create);
  NODE_SET_METHOD(exports, "pca9548a_setChannel", I2CSwitchPca9548A::JS_setChannel);

  NODE_SET_METHOD(exports, "pca9685_create", PwmScurvePca9685::JS_create);
  NODE_SET_METHOD(exports, "pca9685_setPlan", PwmScurvePca9685::JS_setPlan);
  NODE_SET_METHOD(exports, "pca9685_getCurrentIndex", PwmScurvePca9685::JS_getCurrentIndex);
  NODE_SET_METHOD(exports, "pca9685_enable", PwmScurvePca9685::JS_enable);
  NODE_SET_METHOD(exports, "pca9685_disable", PwmScurvePca9685::JS_disable);
  NODE_SET_METHOD(exports, "pca9685_setCyclePeriod", PwmScurvePca9685::JS_setCyclePeriod);
  NODE_SET_METHOD(exports, "pca9685_start", PwmScurvePca9685::JS_start);
  NODE_SET_METHOD(exports, "pca9685_stop", PwmScurvePca9685::JS_stop);

  NODE_SET_METHOD(exports, "shutdown", shutdown);
}

NODE_MODULE(i2cNative, init)
