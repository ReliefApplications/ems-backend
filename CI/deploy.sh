#!/bin/bash

set -e

echo -e "Stopping docker containers..."
CMD="cd $REMOTE_PATH && echo $SSH_PASS | sudo -S docker compose pull api"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "$CMD"

echo -e "Stopping docker containers..."
CMD="cd $REMOTE_PATH && echo $SSH_PASS | sudo -S docker compose up -d --no-deps api"
ssh -oStrictHostKeyChecking=no -o PubkeyAuthentication=yes $CONNECTION "$CMD"

echo -e "Deployed!"
