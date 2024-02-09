#!/bin/sh
set -e
/usr/sbin/sshd
exec gunicorn -w 4 -b 0.0.0.0:8000 app:app
