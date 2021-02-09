FROM node:14-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm i

COPY . /usr/src/app

EXPOSE 3000

CMD [ "npm", "run", "dev"]