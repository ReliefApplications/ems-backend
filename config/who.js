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
      local: false,
      list: {
        apiConfiguration: '62cc2355d3d00f628c6d3574',
        endpoint: 'referenceData/items/SystemPosition',
        path: '$.value[?(@.ApplicationId==1)]',
        id: 'Id',
        title: 'Name',
        description: 'Description',
      },
      user: {
        apiConfiguration: '62cc2355d3d00f628c6d3574',
        endpoint: 'users/permissions',
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
          value: 'location',
          text: 'Location',
        },
      ],
      apiConfiguration: '62cc2355d3d00f628c6d3574',
      endpoint: 'users',
      mapping: [
        {
          field: 'attributes.region',
          value: 'userBaseLocation.region.name',
        },
        {
          field: 'attributes.country',
          value: 'userBaseLocation.country.name',
        },
        {
          field: 'attributes.location',
          value: 'userBaseLocation.locationType.name',
        },
      ],
    },
  },
};
