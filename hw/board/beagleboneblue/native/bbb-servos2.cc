#if defined(linux)
extern "C"
{
#include <roboticscape.h>
}
#else
// Mocks
inline void rc_send_servo_pulse_us(int ch, int us) {}
inline void rc_enable_servo_power_rail(void) {}
#endif

#define	MOTION_NAMESPACE      BBBlueServos2
#define MOTION_NR_DEVICES     1
#define MOTION_NR_SUBDEVICES  8

namespace MOTION_NAMESPACE
{

void init(void)
{
  rc_enable_servo_power_rail();
}

void deinit(void)
{
}

inline void create_native(int device_nr, const void* args)
{
}

inline void cycleperiod_native(int device_nr, double cycleMs)
{
}

inline void actions_begin(int device_nr)
{
}

inline void actions_end(int device_nr)
{
}

inline void action(int device_nr, int subdevice_nr, float value)
{
  // value = milliseconds
  rc_send_servo_pulse_us(subdevice_nr + 1, (int)(1000 * value));
}

}

#include "../../../helpers/motion-inc.cc"
