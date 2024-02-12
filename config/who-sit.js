/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */
module.exports = {
  server: {
    rateLimit: {
      enable: false,
      max: 500,
    },
  },
  email: {
    sendInvite: false,
  },
  user: {
    groups: {
      local: true,
    },
    attributes: {
      local: true,
    },
  },
};
