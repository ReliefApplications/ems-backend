/**
 * Mapping of environment variables with project configuration.
 */
module.exports = {
  server: {
    url: 'SERVER_URL',
    allowedOrigins: 'SERVER_ALLOWED_ORIGINS',
  },
  frontOffice: {
    uri: 'FRONT_OFFICE_URI',
  },
  backOffice: {
    uri: 'BACK_OFFICE_URI',
  },
  database: {
    provider: 'DB_PROVIDER',
    prefix: 'DB_PREFIX',
    host: 'DB_HOST',
    port: 'DB_PORT',
    name: 'DB_NAME',
    user: 'DB_USER',
    pass: 'DB_PASS',
    sslCA: 'DB_SSL_CA',
  },
  email: {
    from: 'MAIL_FROM',
    fromPrefix: 'MAIL_FROM_PREFIX',
    replyTo: 'MAIL_REPLY_TO',
    host: 'MAIL_HOST',
    port: 'MAIL_PORT',
    user: 'MAIL_USER',
    pass: 'MAIL_PASS',
  },
  auth: {
    provider: 'AUTH_PROVIDER',
    url: 'AUTH_URL',
    realm: 'AUTH_REALM',
    clientId: 'AUTH_CLIENT_ID',
    tenantId: 'AUTH_TENANT_ID',
    allowedIssuers: 'AUTH_ALLOWED_ISSUERS',
  },
  encryption: {
    key: 'ENCRYPTION_KEY',
  },
  blobStorage: {
    connectionString: 'BLOB_STORAGE_CONNECTION_STRING',
  },
  rabbitMQ: {
    application: 'RABBITMQ_APPLICATION',
    user: 'RABBITMQ_DEFAULT_USER',
    pass: 'RABBITMQ_DEFAULT_PASS',
    port: 'RABBITMQ_PORT',
    host: 'RABBITMQ_HOST',
  },
  redis: {
    url: 'REDIS_URL',
    password: 'REDIS_PASS',
  },
  commonServices: {
    clientId: 'COMMON_SERVICES_CLIENT_ID',
    clientSecret: 'COMMON_SERVICES_CLIENT_SECRET',
    scope: 'COMMON_SERVICES_SCOPE',
  },
};
