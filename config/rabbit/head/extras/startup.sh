#! /bin/sh
cd $(dirname $0)
sudo chmod 666 /dev/tty*
xinit ./head.sh -- -nocursor
