# Configuration

Configuration is handled by the [config](https://www.npmjs.com/package/config) package.

Files in the [config/](../config/) directory define one configuration per environment. The active one is selected with the `NODE_CONFIG_ENV` environment variable (for example `NODE_CONFIG_ENV=local`), falling back to [config/default.js](../config/default.js) for any value not overridden.

Environment variables are mapped to configuration keys in [config/custom-environment-variables.js](../config/custom-environment-variables.js). Locally, they are usually provided through a `.env` file at the root of the project (loaded by `npm run dev` and docker compose).

## Mandatory settings

The server checks the following keys at startup ([checkConfig.util.ts](../src/utils/server/checkConfig.util.ts)) and exits if any of them is empty:

`server.url`, `server.allowedOrigins`, `server.protectedShortcuts`, `frontOffice.uri`, `backOffice.uri`, `database.provider`, `database.prefix`, `database.host`, `database.name`, `database.user`, `database.pass`.

## Environment variables

### Server

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `SERVER_PORT` | `server.port` | `3000` | Port the Express server listens on |
| `SERVER_URL` | `server.url` | – | Public URL of the API. **Mandatory** |
| `SERVER_ALLOWED_ORIGINS` | `server.allowedOrigins` | `[]` | Origins allowed by CORS. **Mandatory** |
| `SERVER_PROTECTED_SHORTCUTS` | `server.protectedShortcuts` | `[]` | Reserved shortcuts that cannot be used by applications. **Mandatory** |

### Front-ends

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `FRONT_OFFICE_URI` | `frontOffice.uri` | – | URL of the front-office front-end. **Mandatory** |
| `BACK_OFFICE_URI` | `backOffice.uri` | – | URL of the back-office front-end. **Mandatory** |

### Database

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `DB_PROVIDER` | `database.provider` | – | One of `mongodb+srv`, `mongodb`, `cosmosdb`, `docker` — determines how the connection string is built ([database.ts](../src/server/database.ts)). **Mandatory** |
| `DB_PREFIX` | `database.prefix` | – | Connection string scheme (e.g. `mongodb`, `mongodb+srv`). **Mandatory** |
| `DB_HOST` | `database.host` | – | Database host. **Mandatory** |
| `DB_PORT` | `database.port` | – | Database port (not used with the `mongodb+srv` provider) |
| `DB_NAME` | `database.name` | – | Database name. **Mandatory** |
| `DB_USER` | `database.user` | – | Database user. **Mandatory** |
| `DB_PASS` | `database.pass` | – | Database password. **Mandatory** |
| `DB_SSL_CA` | `database.sslCA` | – | CA certificate, enables SSL validation when set |

### Authentication

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `AUTH_PROVIDER` | `auth.provider` | – | `azure` (Azure AD) or `keycloak` |
| `AUTH_URL` | `auth.url` | – | URL of the authentication server (Keycloak) |
| `AUTH_REALM` | `auth.realm` | – | Realm (Keycloak) |
| `AUTH_CLIENT_ID` | `auth.clientId` | – | Client ID of the application |
| `AUTH_TENANT_ID` | `auth.tenantId` | – | Tenant ID (Azure AD) |
| `AUTH_ALLOWED_ISSUERS` | `auth.allowedIssuers` | `[]` | Issuers accepted when validating tokens |
| `AUTH_AUDIENCE` | `auth.audience` | – | Audience accepted when validating tokens |

### Email

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `MAIL_FROM` | `email.from` | – | Sender address |
| `MAIL_FROM_PREFIX` | `email.fromPrefix` | `No reply` | Display name of the sender |
| `MAIL_REPLY_TO` | `email.replyTo` | – | Reply-to address |
| `MAIL_HOST` | `email.host` | – | SMTP host |
| `MAIL_PORT` | `email.port` | – | SMTP port |
| `MAIL_USER` | `email.user` | – | SMTP user |
| `MAIL_PASS` | `email.pass` | – | SMTP password |
| `MAIL_BLOB_STORAGE_CONNECTION_STRING` | `email.blobStorage.connectionString` | – | Blob storage connection used for email attachments |
| `MAIL_BLOB_STORAGE_CONTAINER` | `email.blobStorage.container` | – | Blob storage container used for email attachments |
| `MAIL_SERVERLESS_URL` | `email.serverless.url` | – | URL of the serverless email service |
| `MAIL_SERVERLESS_KEY` | `email.serverless.key` | – | API key of the serverless email service |

### Redis

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `REDIS_URL` | `redis.url` | – | Redis connection URL (caching and GraphQL subscriptions) |
| `REDIS_PASS` | `redis.password` | – | Redis password |

### Storage & encryption

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `BLOB_STORAGE_CONNECTION_STRING` | `blobStorage.connectionString` | – | Azure Blob Storage connection string (file uploads) |
| `PUBLIC_STORAGE_URL` | `publicStorage.url` | – | URL of the public storage |
| `ENCRYPTION_KEY` | `encryption.key` | – | Key used to encrypt stored secrets (e.g. API configuration credentials) |

### Common Services

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `COMMON_SERVICES_TOKEN_ENDPOINT` | `commonServices.tokenEndpoint` | – | Token endpoint of the WHO Common Services |
| `COMMON_SERVICES_CLIENT_ID` | `commonServices.clientId` | – | Client ID |
| `COMMON_SERVICES_CLIENT_SECRET` | `commonServices.clientSecret` | – | Client secret |
| `COMMON_SERVICES_SCOPE` | `commonServices.scope` | – | Scope requested when fetching a token |
| `COMMON_SERVICES_URL` | `commonServices.url` | – | URL of the Common Services API |

### Microsoft Graph

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `MICROSOFT_GRAPH_TOKEN_ENDPOINT` | `microsoftGraph.tokenEndpoint` | – | Token endpoint used to call Microsoft Graph |
| `MICROSOFT_GRAPH_CLIENT_ID` | `microsoftGraph.clientId` | – | Client ID |
| `MICROSOFT_GRAPH_CLIENT_SECRET` | `microsoftGraph.clientSecret` | – | Client secret |

### RabbitMQ

The RabbitMQ integration is currently disabled; only `rabbitMQ.application` is still read, as prefix of the routing key used by the publish mutation.

| Variable | Config key | Default | Description |
| --- | --- | --- | --- |
| `RABBITMQ_APPLICATION` | `rabbitMQ.application` | – | Application name, used as routing key prefix |
| `RABBITMQ_DEFAULT_USER` | `rabbitMQ.user` | – | Unused |
| `RABBITMQ_DEFAULT_PASS` | `rabbitMQ.pass` | – | Unused |
| `RABBITMQ_HOST` | `rabbitMQ.host` | – | Unused |
| `RABBITMQ_PORT` | `rabbitMQ.port` | – | Unused |

## Settings without environment variables

These can only be set in the configuration files:

| Config key | Default | Description |
| --- | --- | --- |
| `server.rateLimit.enable` | `true` | Enable rate limiting |
| `server.rateLimit.windowMs` | `60000` | Rate limit window, in milliseconds |
| `server.rateLimit.max` | `500` | Maximum number of requests per window |
| `server.pagination.limit` | `1000` | Maximum page size of GraphQL queries |
| `email.sendInvite` | `false` | Send an email to invited users |
| `email.maxRecipients` | `1000` | Maximum number of recipients per email |
| `user.groups` | – | Definition of user groups, locally or from an external endpoint (see comments in [config/default.js](../config/default.js)) |
| `user.attributes` | – | Definition of user attributes, locally or from an external endpoint (see comments in [config/default.js](../config/default.js)) |
| `user.useMicrosoftGraph` | `false` | Fetch user information from Microsoft Graph |
| `logger.keep` | `true` | Keep log files |
| `archive.expires` | `2592000` | Archive expiration time, in seconds (30 days) |
| `publicStorage.enable` | `false` | Enable public storage |
