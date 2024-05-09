/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */
module.exports = {
  email: {
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
  events: {
    provider: 'oort',
    login: true,
    logout: true,
    downloadFile: true,
    navigate: false,
    addRecord: ['Deliverables', 'Item'],
    updateRecord: ['Deliverables', 'Item'],
    deleteRecord: ['Deliverables', 'Item'],
  },
};
