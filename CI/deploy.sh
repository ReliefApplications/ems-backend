#!/bin/bash

# Remove files
REMOTE_PATH=/var/www/html/api-ems-ui-poc
OUT=.
REMOTE_PATH_RA=/var/www/html/ra-safe-api
OUT=.
CONNECTION=reliefapps@92.243.25.191

set -e
# TEST
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

# RA
echo -e "Stopping docker containers..."
CMD="'""cd $REMOTE_PATH_RA && echo '$SSH_PASS' | sudo -S docker-compose down""'"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "'"$CMD"'"

echo -e "Synchronizing files..."
rsync -e "ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=yes" -avzr --delete --exclude-from 'exclude-list.txt' $OUT_RA/* $CONNECTION:$REMOTE_PATH_RA
CMD="'""cd $REMOTE_PATH_RA && mv docker-compose.yml.dist.ra docker-compose.yml""'"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "'"$CMD"'"

echo -e "Starting docker containers..."
CMD="'""cd $REMOTE_PATH_RA && echo '$SSH_PASS' | sudo -S docker-compose up --build -d""'"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "'"$CMD"'"


echo -e "Deployed!"
