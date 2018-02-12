cmake_minimum_required (VERSION 2.8.8)

project (RobotVision)

add_compile_options(-std=c++11 -Wall -Wextra -Wsign-conversion)

find_package(OpenCV REQUIRED)
find_package(Threads REQUIRED)
find_package(Boost 1.53.0 COMPONENTS system thread REQUIRED)

add_executable(RobotVision main.cpp video_server.cpp)

target_link_libraries(RobotVision ${Boost_LIBRARIES} ${OpenCV_LIBS})
