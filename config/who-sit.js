/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */
module.exports = {
  server: {
    rateLimit: {
      max: 500,
    },
  },
  email: {
    sendInvite: false,
  },
};
