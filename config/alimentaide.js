/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */
module.exports = {
  email: {
    locale: 'fr',
    sendInvite: true,
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
