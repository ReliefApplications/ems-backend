FROM node:14-alpine as base

ENV CHROME_BIN=/usr/bin/chromium-browser
RUN echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    apk add --no-cache \
      chromium@edge \
      nss@edge

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i

COPY . .

RUN mkdir files

FROM base as production

ENV NODE_PATH=./build
ENV NODE_CONFIG_DIR=/home/node/app/config

RUN npm run build
