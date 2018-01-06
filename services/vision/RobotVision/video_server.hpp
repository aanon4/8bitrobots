#include <opencv2/opencv.hpp>
#include "server_http.hpp"

using namespace std;

using HttpServer = SimpleWeb::Server<SimpleWeb::HTTP>;

class VideoServer {
private:

  HttpServer server;
  mutex image_lock;
  std::vector<uchar> image;

public:

  void run();
  void set_image(cv::Mat& frame);
};
