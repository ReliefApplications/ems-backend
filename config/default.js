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
    sendInvite: false,
    from: '',
    fromPrefix: 'No reply',
    replyTo: '',
    maxRecipients: 1000,
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
    sslCA: '',
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
   * User management settings.
   * Definition of groups and attributes locally or from external endpoint.
   * Paths should be in jsonpath syntax: https://github.com/dchester/jsonpath.
   */
  user: {
    /**
     * Settings for groups.
     */
    groups: {
      /**
       * Boolean to specify if groups are defined locally or if they are coming from an endpoint.
       */
      local: null,
      /**
       * Settings to fetch groups list from external API
       */
      list: {
        /**
         * API Configuration ID needed to connect to endpoint.
         */
        apiConfiguration: '',
        /**
         * End of the endpoint after API Configuration base URL.
         */
        endpoint: '',
        /**
         * Path to result object.
         */
        path: '',
        /**
         * Path to id field.
         */
        id: '',
        /**
         * Path to title field.
         */
        title: '',
        /**
         * Path to description field.
         */
        description: '',
      },
      /**
       * Settings to user's groups list from external API
       */
      user: {
        /**
         * API Configuration ID needed to connect to endpoint, if any. We're generating a delegated token here.
         * It means the front-end user azure account should have access to the targeted endpoint.
         */
        apiConfiguration: '',
        /**
         * End of the endpoint after API Configuration base URL.
         */
        endpoint: '',
        /**
         * Path to result object.
         */
        path: '',
        /**
         * Path to id field.
         */
        id: '',
      },
    },
    /**
     * Settings for attributes.
     */
    attributes: {
      /**
       * Boolean to specify if attributes are defined locally or if they are coming from an endpoint.
       */
      local: null,
      /**
       * API Configuration ID needed to connect to endpoint, if any. We're generating a delegated token here.
       * It means the front-end user azure account should have access to the targeted endpoint.
       */
      apiConfiguration: '',
      /**
       * End of the endpoint after API Configuration base URL.
       */
      endpoint: '',
      /**
       * Mapping to set user's attributes based on data fetched from external endpoint.
       * Each object of this array has the following structure:
       *
       * field: Path to the user field it's mapped to. Could be at root or under attributes (lodash set syntax).
       * value: Path to value in in data fetched from API (jsonpath syntax).
       */
      mapping: [],
      /**
       * List of available attributes under 'user.attributes'
       * Each object of this array has the following structure:
       *
       * value: Key stored in the DB.
       * text: Title displayed to the user.
       */
      list: [],
    },
  },
  logger: {
    keep: true,
  },
};
