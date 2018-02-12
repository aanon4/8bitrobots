#include <boost/format.hpp>
#include "video_server.hpp"

using namespace std;
using namespace cv;
using HttpServer = SimpleWeb::Server<SimpleWeb::HTTP>;

const float FRAME_RATE = 30;
const chrono::milliseconds frame_time((int)(1000.0 / FRAME_RATE));


void VideoServer::run()
{
  server.config.port = 8081;

  server.resource["^/video$"]["GET"] = [this](shared_ptr<HttpServer::Response> response, shared_ptr<HttpServer::Request> /*request*/) {
    thread work_thread([this, response] {
      class MJPEG {
      public:
        static void send_image(VideoServer* server, const shared_ptr<HttpServer::Response> &response) {
          auto start = chrono::steady_clock::now();
          unique_lock<mutex> lk(server->image_lock);
          if (server->image.empty()) {
            vector<int> params;
            params.push_back(IMWRITE_JPEG_QUALITY);
            params.push_back(75);
            imencode(".jpg", server->frame, server->image, params);
          }
          int size = (int)server->image.size();
          response->write_more("--opencv_video\r\n");
          response->write_more("Content-Type: image/jpeg\r\n");
          response->write_more(str(boost::format("Content-Length: %1%\r\n\r\n") % size));
          response->write((const char*)server->image.data(), size);
          lk.unlock();
          response->write_more("\r\n");
          response->send([server, response, start](const SimpleWeb::error_code &ec) {
            if (!ec) {
              auto duration = chrono::duration_cast<chrono::milliseconds>(chrono::steady_clock::now() - start);
              if (duration < frame_time) {
                this_thread::sleep_for(frame_time - duration);
              }
              send_image(server, response);
            }
            else {
              // Done
              if (server->active > 0)
              {
                server->active--;
              }
            }
          });
        }
      };
      SimpleWeb::CaseInsensitiveMultimap headers;
      headers.emplace("Cache-Control", "no-cache, must-revalidate");
      headers.emplace("Content-Type", "multipart/x-mixed-replace;boundary=opencv_video");
      response->write(SimpleWeb::StatusCode::success_ok, headers);
      this->active++;
      MJPEG::send_image(this, response);
    });
    work_thread.detach();
  };

  
  server.resource["^/test$"]["GET"] = [](shared_ptr<HttpServer::Response> response, shared_ptr<HttpServer::Request> /*request*/) {
    response->write("<html><body><img width='640' height='480' src='/video?" + to_string(rand()) + "'></body></html>");
  };

  server.on_error = [this](shared_ptr<HttpServer::Request> /*request*/, const SimpleWeb::error_code & /*ec*/) {
    // Handle errors here
    if (this->active > 0)
    {
      this->active--;
    }
  };

  server.start();
}

void VideoServer::set_image(Mat& frame)
{
  if (image_lock.try_lock())
  {
    frame.copyTo(this->frame);
    image.clear();
    image_lock.unlock();
  }
}
