#!/bin/sh
set -e

if [ -f /etc/nginx/nginx.conf.template ]; then
  envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
  echo "Generated nginx config:"
  cat /etc/nginx/nginx.conf
fi

exec nginx -g "daemon off;"