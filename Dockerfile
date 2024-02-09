FROM node:18-alpine as base

WORKDIR /home/node/app

COPY package*.json ./

RUN npm i

COPY . .

RUN mkdir -p files

FROM base as production

ENV NODE_PATH=./build
ENV NODE_CONFIG_DIR=/home/node/app/config

RUN npm run build

# Required for ssh in azure web app
COPY sshd_config /etc/ssh/
COPY entrypoint.sh ./

# Start and enable SSH
RUN apk add openssh \
  && echo "root:Docker!" | chpasswd \
  && chmod +x ./entrypoint.sh \
  && cd /etc/ssh/ \
  && ssh-keygen -A

EXPOSE 8000 2222

ENTRYPOINT [ "./entrypoint.sh" ]
