#include <unistd.h>
#include <fcntl.h>
#include <node.h>
#include <sys/ioctl.h>
#if defined(linux)
#include <linux/i2c-dev.h>
#else
// Mocks
#define I2C_SLAVE           0
#endif
#include "i2c-lock.h"
#include "i2c-switch.h"

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::Integer;
using v8::Value;

// Native API

static int i2c;
static uint8_t i2cAddress;
static uint8_t currentChannels = 0;
static uint8_t defaultChannels;


void i2c_Switch_SetChannel(int channel)
{
  uint8_t channels = (uint8_t)(defaultChannels | (channel == -1 ? 0 : (1 << channel)));
  if (channels != currentChannels)
  {
    currentChannels = channels;
    I2CLock::assertlock();
    ioctl(i2c, I2C_SLAVE, i2cAddress);
    write(i2c, &currentChannels, 1);
  }
}

namespace I2CSwitchPca9548A {

void JS_create(const FunctionCallbackInfo<Value>& args)
{
  i2c = open("/dev/i2c-1", O_RDWR);
#if defined(linux)
  assert(i2c != -1);
#endif
  i2cAddress = (uint8_t)args[0]->Int32Value();
  defaultChannels = (uint8_t)args[1]->Int32Value();
}

void JS_setChannel(const FunctionCallbackInfo<Value>& args)
{
  i2c_Switch_SetChannel((uint8_t)args[0]->Int32Value());
}

}
