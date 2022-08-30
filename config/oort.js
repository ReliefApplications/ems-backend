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
      windowMs: 1 * 60 * 1000, // 1 minute
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
  /**
   * Path should be in jsonpath syntax.
   * https://github.com/dchester/jsonpath
   */
  groups: {
    manualCreation: true,
    fromService: {
      apiConfiguration: '',
      groups: {
        endpoint: '',
        path: '',
        idField: '',
        titleField: '',
        descriptionField: '',
      },
      userGroups: {
        endpoint: '',
        path: '',
        idField: '',
      },
      /**
       * Attributes array elements should be in the format
       * {
       *  category: <category id | category title],
       *  valuePath: jsonpath to the value of the attribute on the response,
       * }
       */
      attributes: {
        endpoint: '',
        attributes: [],
      },
    },
  },
};
