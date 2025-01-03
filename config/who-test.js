/* eslint-disable jsdoc/require-jsdoc */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { server, email, user } = require('./who');

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
        path: '$.value[?(@.ApplicationId==1 || @.ApplicationId==5)]',
        id: 'Id',
        title: 'Name',
        description: 'Description',
      },
      user: {
        apiConfiguration: '62cc2355d3d00f628c6d3574',
        endpoint: '/users/permissions',
        path: '$.systemRules.Permissions[?(@.Application=="EMS" || @.Application=="EIS")].ApplicationPositions.*',
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
          value: 'location',
          text: 'Location',
        },
        {
          value: 'department',
          text: 'Department',
        },
      ],
      apiConfiguration: '62cc2355d3d00f628c6d3574',
      endpoint: '/users/permissions',
      mapping: [
        {
          field: 'attributes.region',
          value: '$.user.userBaseLocation.region.name',
        },
        {
          field: 'attributes.country',
          value: '$.user.userBaseLocation.country.name',
        },
        {
          field: 'attributes.location',
          value: '$.user.userBaseLocation.locationType.name',
        },
        {
          field: 'attributes.department',
          value: 'department',
          provider: 'microsoftGraph',
        },
      ],
    },
    useMicrosoftGraph: user.useMicrosoftGraph,
  },
};
