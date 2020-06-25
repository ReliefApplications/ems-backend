#!/bin/bash

# Remove files
REMOTE_PATH=/var/www/html/api-ems-ui-poc
OUT=.
CONNECTION=tester@217.70.189.97

set -e

echo -e "Stopping docker containers..."
CMD="'""cd $REMOTE_PATH && docker-compose down""'"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "'"$CMD"'"

echo -e "Synchronizing files..."
rsync -e "ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=yes" -avzr --delete --exclude-from 'exclude-list.txt' $OUT/* $CONNECTION:$REMOTE_PATH
CMD="'""cd $REMOTE_PATH && mv docker-compose.yml.dist.dev docker-compose.yml""'"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "'"$CMD"'"

echo -e "Starting docker containers..."
CMD="'""cd $REMOTE_PATH && docker-compose up --build -d""'"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "'"$CMD"'"

echo -e "Deployed!"
