#include <node.h>
#if defined(linux)
extern "C"
{
#include <roboticscape.h>
}
#else
// Mocks
inline void rc_initialize(void) {}
inline void rc_cleanup(void) {}
inline void rc_disable_signal_handler(void) {}
#endif

using v8::FunctionCallbackInfo;
using v8::Value;
using v8::Local;
using v8::Object;

namespace BBBlueServos2
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

namespace BBBlueMotors2
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

namespace BBBluePower
{
  extern void JS_batteryVoltage(const FunctionCallbackInfo<Value>& args);
  extern void JS_jackVoltage(const FunctionCallbackInfo<Value>& args);
}

namespace BBBlueGpio
{
  extern void JS_create(const FunctionCallbackInfo<Value>& args);
  extern void JS_setValue(const FunctionCallbackInfo<Value>& args);
  extern void JS_getValue(const FunctionCallbackInfo<Value>& args);
  extern void JS_setDir(const FunctionCallbackInfo<Value>& args);
  extern void JS_onEdge(const FunctionCallbackInfo<Value>& args);
}

static void startup(void)
{
  rc_initialize();
  rc_disable_signal_handler();

  BBBlueServos2::init();
  BBBlueMotors2::init();
}

static void shutdown(const FunctionCallbackInfo<Value>& args)
{
  BBBlueServos2::shutdown();
  BBBlueMotors2::shutdown();
  rc_cleanup();
}

void init(Local<Object> exports)
{
  startup();

  NODE_SET_METHOD(exports, "bbb_servos2_create", BBBlueServos2::JS_create);
  NODE_SET_METHOD(exports, "bbb_servos2_setPlan", BBBlueServos2::JS_setPlan);
  NODE_SET_METHOD(exports, "bbb_servos2_getCurrentIndex", BBBlueServos2::JS_getCurrentIndex);
  NODE_SET_METHOD(exports, "bbb_servos2_enable", BBBlueServos2::JS_enable);
  NODE_SET_METHOD(exports, "bbb_servos2_disable", BBBlueServos2::JS_disable);
  NODE_SET_METHOD(exports, "bbb_servos2_setCyclePeriod", BBBlueServos2::JS_setCyclePeriod);
  NODE_SET_METHOD(exports, "bbb_servos2_start", BBBlueServos2::JS_start);
  NODE_SET_METHOD(exports, "bbb_servos2_stop", BBBlueServos2::JS_stop);

  NODE_SET_METHOD(exports, "bbb_motors2_create", BBBlueMotors2::JS_create);
  NODE_SET_METHOD(exports, "bbb_motors2_setPlan", BBBlueMotors2::JS_setPlan);
  NODE_SET_METHOD(exports, "bbb_motors2_getCurrentIndex", BBBlueMotors2::JS_getCurrentIndex);
  NODE_SET_METHOD(exports, "bbb_motors2_enable", BBBlueMotors2::JS_enable);
  NODE_SET_METHOD(exports, "bbb_motors2_disable", BBBlueMotors2::JS_disable);
  NODE_SET_METHOD(exports, "bbb_motors2_setCyclePeriod", BBBlueMotors2::JS_setCyclePeriod);
  NODE_SET_METHOD(exports, "bbb_motors2_start", BBBlueMotors2::JS_start);
  NODE_SET_METHOD(exports, "bbb_motors2_stop", BBBlueMotors2::JS_stop);

  NODE_SET_METHOD(exports, "bbb_power_battery", BBBluePower::JS_batteryVoltage);
  NODE_SET_METHOD(exports, "bbb_power_jack", BBBluePower::JS_jackVoltage);

  NODE_SET_METHOD(exports, "bbb_gpio_create", BBBlueGpio::JS_create);
  NODE_SET_METHOD(exports, "bbb_gpio_setValue", BBBlueGpio::JS_setValue);
  NODE_SET_METHOD(exports, "bbb_gpio_getValue", BBBlueGpio::JS_getValue);
  NODE_SET_METHOD(exports, "bbb_gpio_setDir", BBBlueGpio::JS_setDir);
  NODE_SET_METHOD(exports, "bbb_gpio_onEdge", BBBlueGpio::JS_onEdge);

  NODE_SET_METHOD(exports, "bbb_shutdown", shutdown);
}

NODE_MODULE(beagleboneblue, init)
