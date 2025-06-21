FROM nginx:alpine

ARG CHARTJS_VERSION
ENV CHARTJS_VERSION=${CHARTJS_VERSION}

WORKDIR /usr/share/nginx/html

COPY . .

RUN apk add --no-cache curl && \
    curl -sO https://cdn.jsdelivr.net/npm/chart.js@${CHARTJS_VERSION}/dist/chart.umd.js && \
    curl -sO https://cdn.jsdelivr.net/npm/chart.js@${CHARTJS_VERSION}/dist/chart.umd.js.map
