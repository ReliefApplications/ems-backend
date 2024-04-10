/* eslint-disable jsdoc/require-jsdoc */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { server, email } = require('./who');

/**
 * Configuration for UAT.
 * Use https://www.npmjs.com/package/config package.
 */
module.exports = {
  ...server,
  ...email,
  user: {
    groups: {
      local: false,
      list: {
        apiConfiguration: '62cc2355d3d00f628c6d3574',
        endpoint: '/referenceData/items/SystemPosition',
        path: '$.value[?(@.ApplicationId==1)]',
        id: 'Id',
        title: 'Name',
        description: 'Description',
      },
      user: {
        apiConfiguration: '62cc2355d3d00f628c6d3574',
        endpoint: '/users/permissions',
        path: '$.systemRules.Permissions[?(@.Application=="EMS")].ApplicationPositions.*',
        id: 'ApplicationPositionId',
      },
    },
    attributes: {
      local: false,
      list: [
        {
          value: 'country',
          text: 'Country',
        },
        {
          value: 'region',
          text: 'Region',
        },
        {
          value: 'orgpath',
          text: 'Organization Path',
        },
      ],
      referenceData: '66167eefb3bb60fba65342b8',
      endpoint: '/users/permissions',
      mapping: [
        {
          field: 'attributes.region',
          value: '$.region.name',
        },
        {
          field: 'attributes.country',
          value: '$.country.name',
        },
        {
          field: 'attributes.orgpath',
          value: '$.orgpath',
        },
      ],
    },
  },
};
