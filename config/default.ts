/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */
export default {
  server: {
    port: 3000,
  },
  frontOffice: {
    uri: 'FRONT_OFFICE_URI',
  },
  backOffice: {
    uri: 'BACK_OFFICE_URI',
  },
  email: {
    sendInvite: true,
  },
};
