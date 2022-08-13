/** Local configuration */
export default {
  groups: {
    manualCreation: false,
    fromService: {
      apiConfiguration: '62f3a0631cfef2001e3c7159',
      groups: {
        endpoint: 'referenceData/items/SystemPosition',
        path: '$.value[?(@.ApplicationId==1)]',
        idField: 'Id',
        titleField: 'Name',
        descriptionField: 'Description',
      },
      userGroups: {
        endpoint: 'users/{id}/permissions',
        path: '$.systemRules.Permissions[?(@.Application=="EMS")].ApplicationPositions.*',
        idField: 'ApplicationPositionId',
      },
      attributes: {
        endpoint: 'users/{id}/permissions',
        attributes: [
          {
            category: '62e7eb598cd9bf001ee19012',
            valuePath:
              '$.systemRules.Permissions[?(@.Application=="EMS")].ApplicationRoleName',
          },
        ],
      },
    },
  },
};
