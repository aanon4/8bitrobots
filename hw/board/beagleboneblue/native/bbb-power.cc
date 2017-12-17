#include <unistd.h>
#include <node.h>
#if defined(linux)
extern "C"
{
#include <roboticscape.h>
}
#else
// Mocks
inline double rc_battery_voltage(void) { return 7.4; }
inline double rc_dc_jack_voltage(void) { return 12.0; }
#endif

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::Integer;
using v8::Number;
using v8::Boolean;
using v8::Value;


namespace BBBluePower {

void JS_batteryVoltage(const FunctionCallbackInfo<Value>& args)
{
  args.GetReturnValue().Set(Number::New(args.GetIsolate(), rc_battery_voltage()));
}

void JS_jackVoltage(const FunctionCallbackInfo<Value>& args)
{
  args.GetReturnValue().Set(Number::New(args.GetIsolate(), rc_dc_jack_voltage()));
}

}
