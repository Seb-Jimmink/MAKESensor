# Dockerfile

FROM eclipse-mosquitto:2

RUN apk add --no-cache openssl gettext
# Install envsubst (gettext)
RUN apk add --no-cache gettext

# Copy config template and entrypoint
COPY config/mosquitto.conf.template /mosquitto/config/mosquitto.conf.template
COPY entrypoint.sh /tmp/entrypoint.sh
RUN cat /tmp/entrypoint.sh | tr -d '\r' > /mosquitto/entrypoint.sh && \
    rm /tmp/entrypoint.sh

# Make entrypoint executable
RUN chmod +x /mosquitto/entrypoint.sh

ENTRYPOINT ["/mosquitto/entrypoint.sh"]
