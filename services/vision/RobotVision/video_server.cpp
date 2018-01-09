#include <boost/format.hpp>
#include "video_server.hpp"

using namespace std;
using namespace cv;
using HttpServer = SimpleWeb::Server<SimpleWeb::HTTP>;

void VideoServer::run()
{
  server.config.port = 8081;

  server.resource["^/video$"]["GET"] = [this](shared_ptr<HttpServer::Response> response, shared_ptr<HttpServer::Request> /*request*/) {
    response->set_nodelay();
    thread work_thread([this, response] {
      class MJPEG {
      public:
        static void send_image(VideoServer* server, const shared_ptr<HttpServer::Response> &response) {
          unique_lock<mutex> lk(server->image_lock);
          server->image_notify.wait(lk);
          if (server->image.empty()) {
            imencode(".jpg", server->frame, server->image, vector<int>());
          }
          int size = (int)server->image.size();
          response->write_more("--opencv_video\r\n");
          response->write_more("Content-Type: image/jpeg\r\n");
          response->write_more(str(boost::format("Content-Length: %1%\r\n\r\n") % size));
          response->write((const char*)server->image.data(), size);
          lk.unlock();
          response->write_more("\r\n");
          response->send([server, response](const SimpleWeb::error_code &ec) {
            if (!ec) {
              send_image(server, response);
            }
            else {
              // Done
              server->active--;
            }
          });
        }
      };
      SimpleWeb::CaseInsensitiveMultimap headers;
      headers.emplace("Content-Type", "multipart/x-mixed-replace;boundary=opencv_video");
      response->write(SimpleWeb::StatusCode::success_ok, headers);
      this->active++;
      MJPEG::send_image(this, response);
    });
    work_thread.detach();
  };

  
  server.resource["^/test$"]["GET"] = [](shared_ptr<HttpServer::Response> response, shared_ptr<HttpServer::Request> /*request*/) {
    response->write("<html><body><img src='/video'></body></html>");
  };

  server.on_error = [](shared_ptr<HttpServer::Request> /*request*/, const SimpleWeb::error_code & /*ec*/) {
    // Handle errors here
  };

  server.start();
}

void VideoServer::set_image(Mat& frame)
{
  if (active > 0 && image_lock.try_lock())
  {
    frame.copyTo(this->frame);
    image.clear();
    image_notify.notify_all();
    image_lock.unlock();
  }
}
