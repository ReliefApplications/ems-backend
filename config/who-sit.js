/* eslint-disable jsdoc/require-jsdoc */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { server, email } = require('./who');

/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */
module.exports = {
  ...server,
  ...email,
  ...user,
};
