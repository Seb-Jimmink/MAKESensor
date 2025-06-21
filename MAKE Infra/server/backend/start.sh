#!/bin/sh

# Use variables from .env
echo "CA cert path: $CERT_PATH"
echo "Postgres host: $POSTGRES_HOST"
echo "Postgres user: $POSTGRES_USER"
echo "API port: $API_PORT"

# Wait for CA cert
while [ ! -f "$CA_CERT_PATH" ]; do
  echo "Waiting for Mosquitto CA cert at $CA_CERT_PATH..."
  sleep 1
done

# Wait for Postgres to be available
while ! nc -z "$POSTGRES_HOST" 5432; do
  echo "Waiting for Postgres at $POSTGRES_HOST:5432..."
  sleep 2
done

echo "All dependencies up! Starting backend..."
exec node server.js