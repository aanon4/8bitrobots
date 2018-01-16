#include "video_server.hpp"
#include "lane_detector.hpp"

using namespace cv;
using namespace std;

const float FRAME_DELAY = 8; // I'm seeing an 8-frame delay to render
const float MAX_LATENCY = 0.100; // 100ms is the acceptable latency
const float FRAME_RATE = (int)(FRAME_DELAY / MAX_LATENCY); // So this is the required frame rate
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
    cap.set(CAP_PROP_FRAME_WIDTH, 320);
    cap.set(CAP_PROP_FRAME_HEIGHT, 240);
    cap.set(CAP_PROP_FPS, FRAME_RATE);
    if (!cap.isOpened()) {
      cerr << "Error";
      return -1;
    }

    for (;;) {
      auto start = chrono::steady_clock::now();

      Mat frame;
      cap.read(frame);

      //lane.process_image(frame);
      //lane.get_result(&frame);

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
