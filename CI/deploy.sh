#!/bin/bash

# Remove files
REMOTE_PATH=/var/www/html/api-ems-ui-poc
OUT=.
CONNECTION=reliefapps@92.243.25.191

set -e

echo -e "Stopping docker containers..."
CMD="'""cd $REMOTE_PATH && echo '$SSH_PASS' | sudo -S docker-compose down""'"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "'"$CMD"'"

echo -e "Synchronizing files..."
rsync -e "ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=yes" -avzr --delete --exclude-from 'exclude-list.txt' $OUT/* $CONNECTION:$REMOTE_PATH
CMD="'""cd $REMOTE_PATH && mv docker-compose.yml.dist.dev docker-compose.yml""'"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "'"$CMD"'"

echo -e "Starting docker containers..."
CMD="'""cd $REMOTE_PATH && echo '$SSH_PASS' | sudo -S docker-compose up --build -d""'"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "'"$CMD"'"

echo -e "Deployed!"
