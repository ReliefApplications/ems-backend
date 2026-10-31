/**
 * Standard configuration.
 * Use https://www.npmjs.com/package/config package.
 */
module.exports = {
  server: {
    // Azure Front Door, then the App Service front end, in front of the container
    trustProxy: 2,
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
    useMicrosoftGraph: true,
  },
};
