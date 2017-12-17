#if defined(linux)
extern "C"
{
#include <linux/i2c-dev.h>
}
#else
// Mocks
#define I2C_SLAVE 0
#endif
#include <unistd.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <node.h>
#include "i2c-lock.h"
#include "i2c-switch.h"

using v8::FunctionCallbackInfo;
using v8::Value;

#define	MOTION_NAMESPACE      PwmScurvePca9685
#define MOTION_NR_DEVICES     4
#define MOTION_NR_SUBDEVICES  16

#define CONFIG_MODE1          0x20 // NORESTART, INTCLK, AUTOINC, NOSLEEP, NOSUB1, NOSUB2, NOSUB3, NOALLCALL
#define CONFIG_MODE2          0x04 // ONSTOP, NOOPENDRAIN, OUTENABLE
#define CONFIG_SLEEP_BIT      0x10
#define CONFIG_PRESCALER      0xFF

namespace MOTION_NAMESPACE
{

static int i2c = -1;
static struct {
  uint8_t i2cAddress;
  uint8_t changes;
  double scale;
  uint8_t subaddress;
  uint8_t values[MOTION_NR_SUBDEVICES][4];
} hwdevice[MOTION_NR_DEVICES];

void init(void)
{
  i2c = open("/dev/i2c-1", O_RDWR);
#if defined(linux)
  assert(i2c != -1);
#endif
}

void deinit(void)
{
  close(i2c);
  i2c = -1;
}

inline void create_native(int device_nr, const FunctionCallbackInfo<Value>* args)
{
  hwdevice[device_nr].i2cAddress = (*args)[0]->Int32Value();
  hwdevice[device_nr].subaddress = 6;
  hwdevice[device_nr].scale = 4096.0 / 40; // 25Hz

  I2CLock::lock();
  i2c_Switch_SetChannel(0);

  static uint8_t cmd0[] = { 0x00, CONFIG_MODE1 };
  static uint8_t cmd1[] = { 0x01, CONFIG_MODE2 };
  static uint8_t cmd2[] = { 0xFE, CONFIG_PRESCALER };

  ioctl(i2c, I2C_SLAVE, hwdevice[device_nr].i2cAddress);
  write(i2c, cmd0, sizeof(cmd0));
  write(i2c, cmd1, sizeof(cmd1));
  write(i2c, cmd2, sizeof(cmd2));
  
  I2CLock::unlock();
}

inline void cycleperiod_native(int device_nr, double cycleMs)
{
  hwdevice[device_nr].scale = 4096.0 / cycleMs;

  // Configure hw device
  I2CLock::lock();
  i2c_Switch_SetChannel(0);
  ioctl(i2c, I2C_SLAVE, hwdevice[device_nr].i2cAddress);

  uint8_t cmd0[] = { 0x00, CONFIG_MODE1 | CONFIG_SLEEP_BIT };
  uint8_t cmd1[] = { 0xFE, (uint8_t)((25 * 1000 * 1000 * cycleMs) / (4096 * 1000) - 1) };
  uint8_t cmd2[] = { 0x00, CONFIG_MODE1 };

  write(i2c, cmd0, sizeof(cmd0));
  write(i2c, cmd1, sizeof(cmd1));
  write(i2c, cmd2, sizeof(cmd2));

  I2CLock::unlock();
}

inline void actions_begin(int device_nr)
{
  hwdevice[device_nr].changes = 0;
}

inline void actions_end(int device_nr)
{
  if (hwdevice[device_nr].changes)
  {
    I2CLock::lock();
    i2c_Switch_SetChannel(0);
    ioctl(i2c, I2C_SLAVE, hwdevice[device_nr].i2cAddress);
    if (write(i2c, &hwdevice[device_nr].subaddress, 1 + MOTION_NR_SUBDEVICES * 4) != 1 + MOTION_NR_SUBDEVICES * 4)
    {
      printf("i2c error\n");
    }
    I2CLock::unlock();
  }
}

inline void action(int device_nr, int subdevice_nr, float value)
{
  // value == milliseconds
  uint16_t v = (uint16_t)(value * hwdevice[device_nr].scale - 1);
  hwdevice[device_nr].values[subdevice_nr][2] = (uint8_t)v;
  hwdevice[device_nr].values[subdevice_nr][3] = (uint8_t)(v >> 8);
  hwdevice[device_nr].changes = 1;
}

}

#include "../../../helpers/motion-inc.cc"
