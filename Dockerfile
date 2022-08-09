FROM node:14-alpine as base

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i

COPY . .

RUN mkdir files

FROM base as production

ENV NODE_PATH=./build
ENV NODE_CONFIG_DIR=/home/node/app/build/config

RUN npm run build
