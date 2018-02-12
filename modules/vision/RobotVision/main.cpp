#include "video_server.hpp"
#include "lane_detector.hpp"

using namespace cv;
using namespace std;

const float FRAME_RATE = 10;
const chrono::milliseconds frame_time((int)(1000.0 / FRAME_RATE));

int main()
{
  VideoServer server;
  LaneDetector lane;

  thread server_thread([&server]() {
    server.run();
  });

  thread capture_thread([&server, &lane]() {
    VideoCapture cap;
    cap.open(0, CAP_ANY);
    cap.set(CAP_PROP_FRAME_WIDTH, 640);
    cap.set(CAP_PROP_FRAME_HEIGHT, 480);
    cap.set(CAP_PROP_FPS, FRAME_RATE);
    if (!cap.isOpened()) {
      cerr << "Error";
      return -1;
    }

    for (;;) {
      auto start = chrono::steady_clock::now();

      Mat frame;
      cap.read(frame);

      // Send frame off to be viewed
      server.set_image(frame);

      auto duration = chrono::duration_cast<chrono::milliseconds>(chrono::steady_clock::now() - start);
      if (duration < frame_time) {
        this_thread::sleep_for(frame_time - duration);
      }
    }
  });


  server_thread.join();
  capture_thread.join();
}
