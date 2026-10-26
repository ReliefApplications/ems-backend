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

## Record storage

By default, the records of every form live in the `records` collection of the main database, and their versions in `versions`. A form can instead be given a **storage database**: another database of the same cluster, holding the records and versions of the form in collections of the same names. The main database only keeps a _stub_ per record (its id, resource, form, flags, dates, incremental id, version ids, creator and the name of the storage database: no data, no form or user snapshots). The application behaves the same either way: the stub tells it where the record is, and every query on the form runs on its storage database.

This is meant for sensitive data that must stay out of reach of people who have direct access to the main database. On the cluster, such a user gets a built-in role (`read` or `readWrite`) on the main database only, and nothing on the storage database, so they can work on everything else and only see the stubs of the stored records. Stubs still reveal that the records exist, how many, when they were created or modified and by whom: trim `STUB_FIELDS` in [src/utils/storage/stubs.ts](src/utils/storage/stubs.ts) to expose less, and run a `reconcile` afterwards. The application's own database user needs `readWrite` on the main database and on every storage database. Project-level roles of the hosting console (data explorer, backups) bypass database roles and must not be given to restricted users.

The setting is never exposed to the front-end: administrators set it directly in the database, on the forms. The records of a resource stay together, so the setting goes on the core form of the resource and applies to all its forms (a standalone form carries its own):

```js
db.forms.updateOne({ _id: ObjectId('<core form id>') }, { $set: { storage: '<database name>' } })
```

Then, with the application stopped, the records are moved with the `record-storage` script:

```
npm run record-storage -- status                              # structures with a storage database, and their counts
npm run record-storage -- move --structure <resource or form id>      # move the records and versions to the storage database
npm run record-storage -- revert --structure <resource or form id>    # move them back, and remove the setting from the forms
npm run record-storage -- reconcile [--structure <resource or form id>]  # fix stubs and stray records after an incident
```

The move is idempotent and can be run again after an interruption; it ends with the same consistency pass as `reconcile`. The storage database is the source of truth: `reconcile` moves records created in full in the main database, refreshes or creates the stubs, and deletes the stubs of records that no longer exist. The application reloads the list of stored forms every 30 seconds and at startup.

Limitation: MongoDB cannot join collections across databases. Related fields between a stored resource and resources of the main database are not resolved in grids, aggregations and calculated fields (they behave as empty), and the `createdBy` / `lastUpdatedBy` source fields of aggregations on a stored resource are empty. Plain references by id, the record pages, the history and the exports work as usual.

## Other scripts

| Command | Description |
| --- | --- |
| `npm run build` | Compile TypeScript to `build/` |
| `npm start` | Run the compiled server |
| `npm run lint` | Lint the codebase with ESLint |
| `npm run format` | Format `src/` with Prettier |
| `npm run check-i18n` | Check translation files for missing keys |
| `npm run record-storage` | Manage the storage databases of records (see [Record storage](#record-storage)) |
