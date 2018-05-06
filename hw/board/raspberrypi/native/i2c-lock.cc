#include <unistd.h>
#include <node.h>
#include <uv.h>
#include "i2c-lock.h"

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::Integer;
using v8::Value;


namespace I2CLock
{
  
static uv_mutex_t _lock;
  
void lock(void)
{
  uv_mutex_lock(&_lock);
}

void unlock(void)
{
  uv_mutex_unlock(&_lock);
}

void assertlock(void)
{
  //assert(uv_mutex_trylock(&_lock) == UV__EBUSY);
}
  
void init(void)
{
  uv_mutex_init(&_lock);
}

void JS_lock(const FunctionCallbackInfo<Value>& args)
{
  switch (args[0]->Int32Value())
  {
    case 0:
      unlock();
      break;
      
    case 1:
      lock();
      break;
      
    default:
      break;
  }
}

}
