#include <condition_variable>
#include <opencv2/opencv.hpp>
#include "server_http.hpp"

class VideoServer {
private:

  SimpleWeb::Server<SimpleWeb::HTTP> server;
  std::mutex image_lock;
  std::condition_variable image_notify;
  std::vector<uchar> image;

public:

  void run();
  void set_image(cv::Mat& frame);
};
