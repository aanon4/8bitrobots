#include "video_server.hpp"

using namespace cv;
using namespace std;

int main()
{
  VideoServer video;

  thread video_thread([&video]() {
    video.run();
  });

  thread capture_thread([&video]() {
    VideoCapture cap;
    cap.open(0 + cv::CAP_ANY);
    if (!cap.isOpened()) {
      cerr << "Error";
      return -1;
    } 
    Mat frame;
    for (;;) {
      cap.read(frame);
      video.set_image(frame);
//      this_thread::sleep_for(chrono::milliseconds((int)(1000 / 20)));
    }
  });


  video_thread.join();
  capture_thread.join();
}
