#include <boost/format.hpp>
#include "video_server.hpp"

void VideoServer::run()
{
  server.config.port = 8081;

  server.resource["^/video$"]["GET"] = [this](shared_ptr<HttpServer::Response> response, shared_ptr<HttpServer::Request> /*request*/) {
    thread work_thread([this, response] {
      class MJPEG {
      public:
        static void send_image(VideoServer* server, const shared_ptr<HttpServer::Response> &response) {
          response->write_more("--opencv_video\r\n");
          response->write_more("Content-Type: image/jpeg\r\n");
          server->image_lock.lock();
          int size = (int)server->image.size();
          response->write_more(str(boost::format("Content-Length: %1%\r\n\r\n") % size));
          response->write((const char*)server->image.data(), size);
          server->image_lock.unlock();
          response->write_more("\r\n");
          response->send([server, response](const SimpleWeb::error_code &ec) {
            if (!ec) {
              this_thread::sleep_for(chrono::milliseconds((int)(1000 / 20)));
              send_image(server, response);
            }
            else {
              // Done
            }
          });
        }
      };
      SimpleWeb::CaseInsensitiveMultimap headers;
      headers.emplace("Content-Type", "multipart/x-mixed-replace;boundary=opencv_video");
      response->write(SimpleWeb::StatusCode::success_ok, headers);
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

void VideoServer::set_image(cv::Mat& frame)
{
  image_lock.lock();
  cv::imencode(".jpg", frame, image, vector<int>());
  image_lock.unlock();
}
