#!/bin/sh
set -e

echo "CERT_PATH is $CERT_PATH"
echo "PASSWD_PATH is $PASSWD_PATH"

mkdir -p "$(dirname "$PASSWD_PATH")"

# 1. Generate certs if they don't exist
if [ ! -f "$CERT_PATH/ca.crt" ]; then
  echo "Generating certificates..."
  "$CERT_PATH/generate-certs.sh"
else
  echo "Certificates already exist. Skipping generation."
fi

# 2. Create password file if it does not exist, otherwise update
if [ -n "$MQTT_USER" ] && [ -n "$MQTT_PASS" ]; then
  if [ ! -f "$PASSWD_PATH" ]; then
    echo "Creating passwd file at $PASSWD_PATH..."
    mosquitto_passwd -b -c "$PASSWD_PATH" "$MQTT_USER" "$MQTT_PASS"
  else
    echo "Updating passwd file at $PASSWD_PATH..."
    mosquitto_passwd -b "$PASSWD_PATH" "$MQTT_USER" "$MQTT_PASS"
  fi
  chown mosquitto:mosquitto "$PASSWD_PATH"
fi

# 3. Fill in the config template
envsubst < /mosquitto/config/mosquitto.conf.template > /mosquitto/config/mosquitto.conf

echo "Mosquitto config:"
cat /mosquitto/config/mosquitto.conf

exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf