/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */
module.exports = {
  server: {
    port: 3000,
    allowedOrigins: [],
    url: '',
    rateLimit: {
      windowMs: 60000,
      max: 100,
    },
  },
  frontOffice: {
    uri: '',
  },
  backOffice: {
    uri: '',
  },
  email: {
    sendInvite: true,
    from: '',
    fromPrefix: 'No reply',
    replyTo: '',
    host: '',
    port: '',
    user: '',
    pass: '',
  },
  database: {
    provider: '',
    prefix: '',
    host: '',
    port: '',
    name: '',
    user: '',
    pass: '',
  },
  auth: {
    provider: '',
    url: '',
    realm: '',
    clientId: '',
    tenantId: '',
    allowedIssuers: [],
  },
  encryption: {
    key: '',
  },
  blobStorage: {
    connectionString: '',
  },
  rabbitMQ: {
    application: '',
    user: '',
    pass: '',
  },
};
