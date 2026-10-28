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

This starts the three services defined in [docker-compose.yml](docker-compose.yml):

| Service | Image | Host ports | Notes |
| --- | --- | --- | --- |
| `api` | built from the [Dockerfile](Dockerfile) | 3000 (API), 9229 (inspector) | Runs `npm run dev` (nodemon) with `config/` and `src/` mounted, so the server reloads on change |
| `mongodb` | `mongo:8` | 27017 | Single-node replica set with authentication (the API opens change streams, which MongoDB only supports on replica sets) |
| `redis` | `redis:7-alpine` | 6379 | Caching and GraphQL subscriptions, no persistence |

The `api` service loads `.env`, but its `DB_*` and `REDIS_*` variables are overridden to point at the `mongodb` and `redis` services: no database configuration is needed in `.env` to run the stack. The default credentials can be changed with optional variables in `.env`:

| Variable | Default | Description |
| --- | --- | --- |
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASS` | `root` / `root` | MongoDB root user |
| `MONGO_DB_NAME` | `hems` | MongoDB database name |
| `REDIS_PASSWORD` | `redis` | Redis password |

MongoDB data persists in the `mongodb_data` and `mongodb_config` volumes; run `docker compose down -v` to reset it.

To start only the databases, for example to run the API on the host:

```
docker compose up mongodb redis
```

From the host (Compass, mongosh, redis-cli), connect with:

```
mongodb://root:root@localhost:27017/?authSource=admin&directConnection=true
redis://localhost:6379   (password: redis)
```

`directConnection=true` is required because the replica set member is advertised as `mongodb:27017`, which only resolves inside the compose network. The `docker` database provider of the API does not set it, so to run `npm run dev` on the host against this MongoDB, map `mongodb` to `127.0.0.1` in your hosts file and use `DB_PROVIDER=docker`, `DB_HOST=mongodb`, `DB_PORT=27017`, `DB_USER=root`, `DB_PASS=root` in `.env`.

The `mongodb` service runs MongoDB as a single-node replica set, which is mandatory: the API opens change streams (`Model.watch()` in [src/server/schemaUpdateTriggers.ts](src/server/schemaUpdateTriggers.ts)), and MongoDB only supports them on replica sets. The API container is wired to it automatically (its `DB_*` variables override the ones of `.env`). Credentials default to `root` / `root` and the database is named `hems`; override them with `MONGO_ROOT_USER`, `MONGO_ROOT_PASS` and `MONGO_DB_NAME` in `.env`.

To run only the database (eg. to use `npm run dev` on the host):

```
docker compose up -d mongodb
```

From the host (Compass, mongosh, `npm run dev` outside docker), connect with:

```
mongodb://root:root@localhost:27017/?authSource=admin&directConnection=true
```

`directConnection=true` is required because the replica set member is advertised as `mongodb:27017`, which only resolves inside the compose network.

### Copy a MongoDB Atlas database into the local database

`mongodump` and `mongorestore` ship with the `mongo` image, so nothing needs to be installed on the host. Replace `<ATLAS_USER>`, `<ATLAS_PASS>`, `<ATLAS_HOST>` and `<SOURCE_DB>` with the Atlas values. The data lands in the local `hems` database (use your `MONGO_DB_NAME` instead if you set one).

```
# 1. Start the database and wait until it is healthy
docker compose up -d mongodb
docker compose exec mongodb sh -c 'until mongosh --quiet -u root -p root --eval "db.hello().isWritablePrimary" | grep -q true; do sleep 2; done'

# 2. Stream the Atlas dump straight into the local replica set
docker compose exec -T mongodb sh -c '
  mongodump --archive --gzip \
    --uri="mongodb+srv://<ATLAS_USER>:<ATLAS_PASS>@<ATLAS_HOST>/<SOURCE_DB>" \
  | mongorestore --archive --gzip --drop \
    --nsFrom="<SOURCE_DB>.*" --nsTo="hems.*" \
    --uri="mongodb://root:root@localhost:27017/?authSource=admin&directConnection=true"
'
```

*   `--drop` replaces the local collections that already exist, so running the command again gives a fresh copy instead of merging.
*   `--nsFrom` / `--nsTo` rename the Atlas database to `hems`. Drop both flags to keep the original name.

To keep a dump on disk and restore it several times without hitting Atlas again:

```
# Dump to ./dump on the host (never commit it: it contains real data)
docker run --rm -v "$PWD/dump:/dump" mongo:8 \
  mongodump --gzip --out=/dump \
  --uri="mongodb+srv://<ATLAS_USER>:<ATLAS_PASS>@<ATLAS_HOST>/<SOURCE_DB>"

# Restore it into the running local container
docker run --rm --network hems-back_default -v "$PWD/dump:/dump" mongo:8 \
  mongorestore --gzip --drop --nsFrom="<SOURCE_DB>.*" --nsTo="hems.*" \
  --uri="mongodb://root:root@mongodb:27017/?authSource=admin" /dump
```

## Run locally

Requires a MongoDB database and a Redis instance reachable through the variables in `.env` (see [Configuration](#configuration)), or the compose databases above.

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
docker compose -f docker-compose.test.yml run --rm test-server
```

Inside the container the tests run against the `mongodb_test` service, as the in-memory MongoDB used by `npm run test` has no Alpine build. CI runs `npm run test` directly.

Or this command:
```
npm run test
```

It is also possible to run tests on a single file, by passing it as a parameter:
```
docker compose -f docker-compose.test.yml run --rm test-server npm run test -- <path_to_file>
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

## Email testing with Mailpit

[Mailpit](https://mailpit.axllent.org) is a local SMTP server with a web UI: it catches every email the API sends, instead of delivering it to real recipients. It is the easiest way to test email sending (user invitations, notifications, email templates...) during development.

Two default behaviors of the code base must be overridden for this to work (see [src/utils/email/sendEmail.ts](src/utils/email/sendEmail.ts)):

*   Outside of production (`NODE_ENV`), emails are not handed to the SMTP transport: [email-templates](https://www.npmjs.com/package/email-templates) runs in preview mode instead. Set `MAIL_SEND=true` to actually send them.
*   The nodemailer transport requires STARTTLS, which Mailpit does not offer out of the box. Set `MAIL_REQUIRE_TLS=false` to allow the plain connection (never do this against a real SMTP server).

### 1. Run Mailpit

```
docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
```

Port 1025 is the SMTP server, port 8025 the web UI.

### 2. Configure the API

In your `.env` file:

```
MAIL_SEND=true
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_FROM=no-reply@example.com
MAIL_USER=
MAIL_PASS=
MAIL_REQUIRE_TLS=false
```

`MAIL_USER` / `MAIL_PASS` can stay empty: Mailpit does not require authentication, and nodemailer skips the login step when the server does not advertise it.

Then start the server, trigger an email (e.g. a user invitation with `email.sendInvite` enabled), and open the Mailpit UI at [http://localhost:8025](http://localhost:8025) to inspect the message.

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
