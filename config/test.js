/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */

module.exports = {
  auth: {
    url: 'https://id-dev.oortcloud.tech/auth',
    clientId: 'ci-client',
    realm: 'oort',
    provider: 'keycloak',
  },
  logger: {
    keep: false,
  },
};
