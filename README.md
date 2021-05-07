SAFE Back-end
=======
[![GitHub version](https://img.shields.io/github/v/release/ReliefApplications/emrs-safe-backend)](https://img.shields.io/github/v/release/ReliefApplications/emrs-safe-backend)

This back-end uses [Node.js](https://nodejs.org) and runs an [Express server](https://expressjs.com). The app data is stored in a [MongoDB](https://www.mongodb.com) database. It exposes a [GraphQL](https://graphql.org/) API.

It was made for a Proof of Concept of a UI Builder for WHO.

To read more about the project, and how to setup the back-end, please refer to the [documentation of the project](https://gitlab.com/who-ems/ui-doc).

*   [Setup](https://gitlab.com/who-ems/ui-doc#how-to-setup)
*   [Deployment](https://gitlab.com/who-ems/ui-doc#how-to-deploy)

# RabbitMQ

If management platform is not reachable at 15672, you can use this command ( while containers are running ):

```
docker-compose exec rabbitmq rabbitmq-plugins enable rabbitmq_management
```
