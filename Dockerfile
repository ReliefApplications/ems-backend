FROM node:18-alpine as base

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i --ignore-scripts

COPY . .

RUN mkdir -p files

FROM base as production

ENV NODE_PATH=./build
ENV NODE_CONFIG_DIR=/home/node/app/config

RUN npm run build
