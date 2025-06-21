# generate-certs.sh

#!/bin/bash
set -e

cd "$(dirname "$0")"

# 1. CA
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -subj "/CN=MyTestCA" -out ca.crt

# 2. Server Cert
openssl genrsa -out server.key 2048
openssl req -new -key server.key -subj "/CN=localhost" -out server.csr
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -sha256

# 3. Expired Server Cert
openssl genrsa -out expired.key 2048
openssl req -new -key expired.key -subj "/CN=expired" -out expired.csr
openssl x509 -req -in expired.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out expired.crt \

# 4. Client Cert
openssl genrsa -out client.key 2048
openssl req -new -key client.key -subj "/CN=test-client" -out client.csr
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out client.crt -days 365 -sha256

echo "All certs generated!"

