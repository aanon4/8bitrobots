#! /bin/sh
# Disable screen saver
xset s off
xset s noblank
# Disable Energy Star
xset -dpms
# Stream head camera
#mjpg_streamer -o "output_http.so --nocommands" -i "input_raspicam.so --width 640 --height 480 --fps 10 --quality 85 -sa -100" &
# Browser behind the eyes
chromium-browser --noerrdialogs --kiosk file:///$(dirname $0)/wait.html --incognito &
# Command server
while true; do
  data=$(echo "HTTP/1.1 200 OK\n\n" | nc -l localhost 1500 | head -1 | tr -d '\n\r')
  if [ "$data" == 'GET /shutdown HTTP/1.1' ]; then
    /sbin/shutdown -h now
  fi
done
