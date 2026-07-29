WHO App Builder Back-end
=======
[![GitHub version](https://img.shields.io/github/v/release/ReliefApplications/ems-backend)](https://img.shields.io/github/v/release/ReliefApplications/ems-backend)

# Versions

Branch | Version | CI
--- | --- | ---
main | ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/ReliefApplications/ems-backend/main) | [![Version](https://github.com/ReliefApplications/ems-backend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ReliefApplications/ems-backend/actions/workflows/ci.yml)
next | ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/ReliefApplications/ems-backend/next?color=6ded5a) | [![Version](https://github.com/ReliefApplications/ems-backend/actions/workflows/ci.yml/badge.svg?branch=next)](https://github.com/ReliefApplications/ems-backend/actions/workflows/ci.yml)
beta | ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/ReliefApplications/ems-backend/beta?color=ecf495) | [![Version](https://github.com/ReliefApplications/ems-backend/actions/workflows/ci.yml/badge.svg?branch=beta)](https://github.com/ReliefApplications/ems-backend/actions/workflows/ci.yml)

# Introduction

This repository contains the back-end of the WHO App Builder.

It uses [Node.js](https://nodejs.org) and runs an [Express server](https://expressjs.com). The app data is stored in a [MongoDB](https://www.mongodb.com) database. It exposes a [GraphQL](https://graphql.org/) API, as well as a REST API.

For infrastructure and deployment documentation, please refer to the [emssafe-infra repository](https://dev.azure.com/WHOHQ/EMSSAFE/_git/emssafe-infra).

# Requirements

*   [Node.js](https://nodejs.org) >= 24
*   A [MongoDB](https://www.mongodb.com) database
*   A [Redis](https://redis.io) instance (caching and GraphQL subscriptions)
*   [Docker](https://www.docker.com) (optional, to run the stack with docker compose)

# Setup

Install the dependencies:

```
npm i
```

Create a `.env` file at the root of the project. It provides the environment variables listed in the [Configuration](#configuration) section, and is required by docker compose.

## Run with Docker

```
docker compose up
```

The `api` service runs `npm run dev` (nodemon) with the source mounted as a volume, so the server reloads on change. The API listens on port 3000.

## Run locally

```
npm run dev
```

## Configuration

Configuration is handled by the [config](https://www.npmjs.com/package/config) package. Files in the [config/](config/) directory define one configuration per environment; the active one is selected with the `NODE_CONFIG_ENV` environment variable (falling back to `config/default.js` values).

Environment variables are mapped to configuration in [config/custom-environment-variables.js](config/custom-environment-variables.js). The main ones are:

| Variable | Description |
| --- | --- |
| `SERVER_PORT` | Port of the API (defaults to 3000) |
| `SERVER_URL` | Public URL of the API |
| `SERVER_ALLOWED_ORIGINS` | Allowed CORS origins |
| `FRONT_OFFICE_URI` / `BACK_OFFICE_URI` | URLs of the front-office and back-office front-ends |
| `DB_PROVIDER`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | MongoDB connection |
| `AUTH_PROVIDER` | Authentication provider (Azure AD or Keycloak) |
| `AUTH_URL`, `AUTH_REALM`, `AUTH_CLIENT_ID`, `AUTH_TENANT_ID`, `AUTH_ALLOWED_ISSUERS`, `AUTH_AUDIENCE` | Authentication settings |
| `REDIS_URL`, `REDIS_PASS` | Redis connection |
| `ENCRYPTION_KEY` | Key used to encrypt stored secrets |
| `BLOB_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection (file uploads) |

Refer to the [configuration guide](docs/CONFIGURATION.md) for the full list of parameters.

# Contributing

Please refer to the [contribution guide](docs/CONTRIBUTING.md) for branching strategy and Pull Request rules.

# Utilities

## Inspector

The dev command exposes the Node.js inspector on port 9229 (also mapped by docker compose). You can use it with browser tools: for Chrome, go to **chrome://inspect** and click on *inspect* below the remote target.

## Testing

In order to execute tests locally, you can execute the command:
```
docker compose -f docker-compose.test.yml run test-server npm run test
```

Or this command:
```
npm run test
```

It is also possible to run tests on a single file, by passing it as a parameter:
```
docker compose -f docker-compose.test.yml run test-server npm run test -- <path_to_file>
```

Or with this command:
```
npm run test -- <path_to_file>
```

You can also limit the tests to one specific folder. For example:
```
npm run test -- --testPathPattern=models
```
Will only run tests in the **models** folder.

If Jest runs out of memory, raise the heap size with the `NODE_OPTIONS` environment variable (this is what the docker test setup does):
```
NODE_OPTIONS=--max-old-space-size=8192 npm run test
```

## Migrations

Database migrations live in the [migrations/](migrations/) directory and are run with the [migrate](https://www.npmjs.com/package/migrate) package:

```
npm run migrate:create -- <migration_name>   # create a new migration from the template
npm run migrate:up                           # apply pending migrations
npm run migrate:down                         # revert the last migration
npm run migrate:list                         # list migrations and their status
```

## Other scripts

| Command | Description |
| --- | --- |
| `npm run build` | Compile TypeScript to `build/` |
| `npm start` | Run the compiled server |
| `npm run lint` | Lint the codebase with ESLint |
| `npm run format` | Format `src/` with Prettier |
| `npm run check-i18n` | Check translation files for missing keys |
