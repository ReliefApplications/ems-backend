OORT Back-end
=======
[![GitHub version](https://img.shields.io/github/v/release/ReliefApplications/ems-backend)](https://img.shields.io/github/v/release/ReliefApplications/ems-backend)
[![CodeQL](https://github.com/ReliefApplications/ems-backend/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/ReliefApplications/ems-backend/actions/workflows/codeql-analysis.yml)

# Introduction

This back-end uses [Node.js](https://nodejs.org) and runs an [Express server](https://expressjs.com). The app data is stored in a [MongoDB](https://www.mongodb.com) database. It exposes a [GraphQL](https://graphql.org/) API.

It was made for a Proof of Concept of a UI Builder for WHO.

To read more about the project, and how to setup the back-end, please refer to the [documentation of the project](https://gitlab.com/who-ems/ui-doc).

*   [Setup](https://gitlab.com/who-ems/ui-doc#how-to-setup)
*   [Deployment](https://gitlab.com/who-ems/ui-doc#how-to-deploy)

# Utilities

Docker-compose executes nodemon command, which provides an inspector tool.

9229 port is allocated to back-end inspection. You can use inspector with browser tools.

For Chrome, go to **chrome://inspect)** and click on *inspect* below the remote target.

## Testing

In order to execute tests locally, you can execute the command:
```
docker-compose -f docker-compose.test.yml run test-server npm run test
```

It is also possible to run tests on a single file, by passing it as a parameter:
```
docker-compose -f docker-compose.test.yml run test-server npm run test -- <path_to_file>
```

## Scripts

You can execute scripts from a deployed instance, or locally.
Scripts are located under the **scripts** folder, and should be written in typescript.

They can be run using javascript on deployed environments.

On deployed environments, you should enter the container to run the script.

Explanations about each script should be written in the script itself.


# RabbitMQ

If management platform is not reachable at 15672, you can use this command ( while containers are running ):

```
docker-compose exec rabbitmq rabbitmq-plugins enable rabbitmq_management
```

