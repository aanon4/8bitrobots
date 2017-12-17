#if defined(linux)
extern "C"
{
#include <roboticscape.h>
}
#else
// Mocks
inline void rc_set_motor(int ch, float vel) {}
inline void rc_enable_motors(void) {}
#endif

#define	MOTION_NAMESPACE      BBBlueMotors2
#define MOTION_NR_DEVICES     1
#define MOTION_NR_SUBDEVICES  4

namespace MOTION_NAMESPACE
{

void init(void)
{
  rc_enable_motors();
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
  rc_set_motor(subdevice_nr + 1, value);
}

}

#include "../../../helpers/motion-inc.cc"
