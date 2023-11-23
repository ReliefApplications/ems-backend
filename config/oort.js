/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */
module.exports = {
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
