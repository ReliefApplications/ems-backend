OORT Back-end
=======
[![GitHub version](https://img.shields.io/github/v/release/ReliefApplications/oort-backend)](https://img.shields.io/github/v/release/ReliefApplications/oort-backend)
[![CodeQL](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml)

# Versions

* 1.1 : [![CI](https://github.com/ReliefApplications/oort-backend/actions/workflows/ci.yml/badge.svg?branch=hotfix-1.1.5)](https://github.com/ReliefApplications/oort-backend/actions/workflows/ci.yml) [![CodeQL](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml/badge.svg?branch=hotfix-1.1.5)](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml)
* 1.2 : [![CI](https://github.com/ReliefApplications/oort-backend/actions/workflows/ci.yml/badge.svg?branch=release-1.2.0)](https://github.com/ReliefApplications/oort-backend/actions/workflows/ci.yml) [![CodeQL](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml/badge.svg?branch=release-1.2.0)](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml)
* 1.3 : [![CI](https://github.com/ReliefApplications/oort-backend/actions/workflows/ci.yml/badge.svg?branch=release-1.3.0)](https://github.com/ReliefApplications/oort-backend/actions/workflows/ci.yml) [![CodeQL](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml/badge.svg?branch=release-1.3.0)](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml)
* 1.4 : [![CI](https://github.com/ReliefApplications/oort-backend/actions/workflows/ci.yml/badge.svg?branch=release-1.3.0)](https://github.com/ReliefApplications/oort-backend/actions/workflows/ci.yml) [![CodeQL](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml/badge.svg?branch=release-1.4.0)](https://github.com/ReliefApplications/oort-backend/actions/workflows/codeql-analysis.yml)

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

# RabbitMQ

If management platform is not reachable at 15672, you can use this command ( while containers are running ):

```
docker-compose exec rabbitmq rabbitmq-plugins enable rabbitmq_management
```

# Useful commands

## Deploy a release

[Standard Version library](https://github.com/conventional-changelog/standard-version) is used by the project.

In order to increase the versions of the code, you can use the related commands:

- For a minor version:

```
npm run release:minor
```

- For a patch:

```
npm run release:patch
```

- For a major version:

```
npm run release:major
```

The cli should indicate the next command to run, in order to deploy the version.
