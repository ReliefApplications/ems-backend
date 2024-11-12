import axios from 'axios';
import * as utils from '@utils/user/getAutoAssignedRoles';
import { logger } from '@services/logger.service';
import config from 'config';
import { User } from '@models/user.model';
import { filterOperator } from '../../../../src/types/filter';
import { Role } from '@models/role.model';

jest.mock('axios');
jest.mock('@services/logger.service');
jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn((setting: string) => {
      switch (setting) {
        case 'microsoftGraph.clientId': {
          return 'mockClientId';
        }
        case 'microsoftGraph.clientSecret': {
          return 'mockClientSecret';
        }
        case 'microsoftGraph.tokenEndpoint': {
          return 'mockTokenEndpoint';
        }
      }
    }),
    util: {
      getEnv: jest.fn((settings: string) => {
        return settings ? 'development' : 'production';
      }),
    },
  };
});
jest.mock('@models/role.model', () => {
  return {
    Role: {
      find: jest.fn(),
      populate: jest.fn(),
    },
  };
});

describe('getGraphAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a token when the request is successful', async () => {
    const token = 'mocked_token';
    (axios as any).mockResolvedValue({
      // need to use any there because typing is messed up
      data: { access_token: token },
    });
    const result = await utils.getGraphAccessToken();
    expect(result).toBe(token);
    expect(axios).toHaveBeenCalledWith({
      url: config.get('microsoftGraph.tokenEndpoint'),
      method: 'post',
      data: expect.any(FormData),
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('should log an error and return undefined when the request fails', async () => {
    (axios as any).mockRejectedValue(new Error('Request failed'));
    const logSpy = jest.spyOn(logger, 'error');

    const result = await utils.getGraphAccessToken();
    expect(result).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith('Request failed', expect.any(Object));
  });
});

describe('getUserGraphInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user graph data when request is successful', async () => {
    const user = { oid: 'mockOid' };
    const mockData = { userType: 'member', department: 'IT' };

    // (getGraphAccessToken as jest.Mock).mockResolvedValue('mockToken');

    jest.spyOn(utils, 'getGraphAccessToken').mockResolvedValue('mockToken');

    (axios as any).mockResolvedValue({ data: mockData });

    const result = await utils.getUserGraphInfo(user as User);
    expect(result).toEqual(mockData);
  });

  it('should log an error and return undefined if request fails', async () => {
    const user = { oid: 'mockOid' };
    (axios as any).mockRejectedValue(new Error('Request failed'));
    const logSpy = jest.spyOn(logger, 'error');

    const result = await utils.getUserGraphInfo(user as User);
    expect(result).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith('Request failed', expect.any(Object));
  });
});

describe('getAutoAssignedRoles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return roles that match auto-assignment filters', async () => {
    const user = { oid: 'mockOid', username: 'test@example.com' };
    // jest
    //   .spyOn(utils, 'getUserGraphInfo')
    //   .mockResolvedValue({ userType: 'Member' });

    const mockRoles = [
      {
        _id: 'role1',
        autoAssignment: [
          {
            field: '{{email}}',
            operator: filterOperator.EQUAL_TO,
            value: 'test@example.com',
          },
        ],
        permissions: [
          { _id: 'perm1', name: 'permission1' },
          { _id: 'perm2', name: 'permission2' },
        ],
      },
    ];
    (Role.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockRoles),
    });

    const result = await utils.getAutoAssignedRoles(user as any);
    expect(result).toEqual(mockRoles);
  });

  it('should return roles that match auto-assignment filters using microsoft graph', async () => {
    const user = {
      oid: 'mockOid',
      username: 'test@example.com',
      markModified: () => {},
      save: () => {},
    } as any;

    (config.get as jest.Mock).mockImplementation((setting: string) => {
      switch (setting) {
        case 'microsoftGraph.clientId': {
          return 'mockClientId';
        }
        case 'microsoftGraph.clientSecret': {
          return 'mockClientSecret';
        }
        case 'microsoftGraph.tokenEndpoint': {
          return 'mockTokenEndpoint';
        }
        case 'user.useMicrosoftGraph': {
          return true;
        }
        case 'user.attributes': {
          return {
            mapping: [
              {
                field: 'attributes.region',
                value: 'region',
                provider: 'microsoftGraph',
              },
            ],
          };
        }
        case 'user.attributes.list': {
          return [
            {
              value: 'region',
              text: 'Region',
            },
          ];
        }
      }
    });
    jest
      .spyOn(utils, 'getUserGraphInfo')
      .mockResolvedValue({ userType: 'Member', region: 'EURO' } as any);

    const mockRoles = [
      {
        _id: 'role1',
        autoAssignment: [
          {
            field: '{{attributes.region}}',
            operator: filterOperator.EQUAL_TO,
            value: 'EURO',
          },
        ],
        permissions: [
          { _id: 'perm1', name: 'permission1' },
          { _id: 'perm2', name: 'permission2' },
        ],
      },
    ];
    (Role.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockRoles),
    });

    const result = await utils.getAutoAssignedRoles(user as any);
    expect(result).toEqual(mockRoles);
  });
});

describe('checkIfRoleIsAssignedToUser', () => {
  it('should return true if any filter in autoAssignment matches user', () => {
    const user = { username: 'test@example.com' };
    const role = {
      autoAssignment: [
        {
          field: '{{email}}',
          operator: filterOperator.CONTAINS,
          value: 'example',
        },
      ],
    };

    const result = utils.checkIfRoleIsAssignedToUser(user as any, role as any);
    expect(result).toBe(true);
  });

  it('should return false if no filter in autoAssignment matches user', () => {
    const user = { username: 'test@example.com' };
    const role = {
      autoAssignment: [
        {
          field: '{{email}}',
          operator: filterOperator.CONTAINS,
          value: 'nonmatching',
        },
      ],
    };

    const result = utils.checkIfRoleIsAssignedToUser(user as any, role as any);
    expect(result).toBe(false);
  });
});

describe('checkIfRoleIsAssigned', () => {
  const user = {
    groups: ['group1', 'group2'],
    username: 'test@example.com',
    attributes: {
      attr1: 'value1',
      attr2: 'value2',
    },
    graphData: {
      userType: 'Guest',
    },
  } as User;

  it('should return true for EQUAL_TO operator with matching groups', () => {
    const filter = {
      field: '{{groups}}',
      operator: filterOperator.EQUAL_TO,
      value: ['group1', 'group2'],
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should return false for EQUAL_TO operator with non-matching groups', () => {
    const filter = {
      field: '{{groups}}',
      operator: filterOperator.EQUAL_TO,
      value: ['group1'],
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should return true for CONTAINS operator with matching groups', () => {
    const filter = {
      field: '{{groups}}',
      operator: filterOperator.CONTAINS,
      value: ['group1'],
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should return false for CONTAINS operator with non-matching groups', () => {
    const filter = {
      field: '{{groups}}',
      operator: filterOperator.CONTAINS,
      value: ['group3'],
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should return false for non-supported operator with groups', () => {
    const filter = {
      field: '{{groups}}',
      operator: filterOperator.GREATER_THAN,
      value: ['group3'],
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should handle OR logic correctly', () => {
    const filter = {
      logic: 'or',
      filters: [
        {
          field: '{{groups}}',
          operator: filterOperator.EQUAL_TO,
          value: ['group1'],
        },
        {
          field: '{{email}}',
          operator: filterOperator.EQUAL_TO,
          value: 'test@example.com',
        },
      ],
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should handle AND logic correctly', () => {
    const filter = {
      logic: 'and',
      filters: [
        {
          field: '{{groups}}',
          operator: filterOperator.CONTAINS,
          value: ['group1'],
        },
        {
          field: '{{email}}',
          operator: filterOperator.EQUAL_TO,
          value: 'test@example.com',
        },
      ],
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should return false for AND logic if one condition fails', () => {
    const filter = {
      logic: 'and',
      filters: [
        {
          field: '{{groups}}',
          operator: filterOperator.EQUAL_TO,
          value: ['group1', 'group2'],
        },
        {
          field: '{{email}}',
          operator: filterOperator.NOT_EQUAL_TO,
          value: 'test@example.com',
        },
      ],
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should handle EQUAL_TO operator for email matching correctly', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.EQUAL_TO,
      value: 'test@example.com',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should handle NOT_EQUAL_TO operator for email', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.NOT_EQUAL_TO,
      value: 'test@different.com',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should return false for unmatched NOT_EQUAL_TO operator for email', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.NOT_EQUAL_TO,
      value: 'test@example.com',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should handle CONTAINS operator for email', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.CONTAINS,
      value: 'test',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should handle DOES_NOT_CONTAIN operator for email', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.DOES_NOT_CONTAIN,
      value: 'other',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should handle STARTS_WITH operator for email', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.STARTS_WITH,
      value: 'test',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should handle ENDS_WITH operator for email', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.ENDS_WITH,
      value: 'example.com',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should return false for unmatched STARTS_WITH operator for email', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.STARTS_WITH,
      value: 'notTest',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should return false for unmatched ENDS_WITH operator for email', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.ENDS_WITH,
      value: 'different.com',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should return false for non-supported operator with email', () => {
    const filter = {
      field: '{{email}}',
      operator: filterOperator.GREATER_THAN,
      value: 'non-supported.com',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should handle userType matching correctly', () => {
    const filter = {
      field: '{{userType}}',
      operator: filterOperator.EQUAL_TO,
      value: 'Guest',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should handle NOT_EQUAL_TO operator for userType', () => {
    const filter = {
      field: '{{userType}}',
      operator: filterOperator.NOT_EQUAL_TO,
      value: 'Member',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should return false for unmatched NOT_EQUAL_TO operator for userType', () => {
    const filter = {
      field: '{{userType}}',
      operator: filterOperator.NOT_EQUAL_TO,
      value: 'Guest',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should return false for invalid filter field', () => {
    const filter = {
      field: '{{invalidField}}',
      operator: filterOperator.EQUAL_TO,
      value: 'value',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should return false for unknown logic type', () => {
    const filter = {
      logic: 'unknown',
      filters: [],
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should return true for matched EQUAL_TO operator with user attribute', () => {
    (config.get as jest.Mock).mockImplementation((setting: string) => {
      switch (setting) {
        case 'microsoftGraph.clientId': {
          return 'mockClientId';
        }
        case 'microsoftGraph.clientSecret': {
          return 'mockClientSecret';
        }
        case 'microsoftGraph.tokenEndpoint': {
          return 'mockTokenEndpoint';
        }
        case 'user.useMicrosoftGraph': {
          return true;
        }
        case 'user.attributes.list': {
          return [
            {
              value: 'attr1',
              text: 'Attr1',
            },
          ];
        }
      }
    });
    const filter = {
      field: '{{attributes.attr1}}',
      operator: filterOperator.EQUAL_TO,
      value: 'value1',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(true);
  });

  it('should return false for unmatched EQUAL_TO operator with user attribute', () => {
    (config.get as jest.Mock).mockImplementation((setting: string) => {
      switch (setting) {
        case 'microsoftGraph.clientId': {
          return 'mockClientId';
        }
        case 'microsoftGraph.clientSecret': {
          return 'mockClientSecret';
        }
        case 'microsoftGraph.tokenEndpoint': {
          return 'mockTokenEndpoint';
        }
        case 'user.useMicrosoftGraph': {
          return true;
        }
        case 'user.attributes.list': {
          return [
            {
              value: 'attr1',
              text: 'Attr1',
            },
          ];
        }
      }
    });
    const filter = {
      field: '{{attributes.attr1}}',
      operator: filterOperator.EQUAL_TO,
      value: 'value2',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should return false for unsupported operator with user attribute', () => {
    (config.get as jest.Mock).mockImplementation((setting: string) => {
      switch (setting) {
        case 'microsoftGraph.clientId': {
          return 'mockClientId';
        }
        case 'microsoftGraph.clientSecret': {
          return 'mockClientSecret';
        }
        case 'microsoftGraph.tokenEndpoint': {
          return 'mockTokenEndpoint';
        }
        case 'user.useMicrosoftGraph': {
          return true;
        }
        case 'user.attributes.list': {
          return [
            {
              value: 'attr1',
              text: 'Attr1',
            },
          ];
        }
      }
    });
    const filter = {
      field: '{{attributes.attr1}}',
      operator: filterOperator.GREATER_THAN,
      value: 'value1',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });

  it('should return false for non-existing user attribute', () => {
    (config.get as jest.Mock).mockImplementation((setting: string) => {
      switch (setting) {
        case 'microsoftGraph.clientId': {
          return 'mockClientId';
        }
        case 'microsoftGraph.clientSecret': {
          return 'mockClientSecret';
        }
        case 'microsoftGraph.tokenEndpoint': {
          return 'mockTokenEndpoint';
        }
        case 'user.useMicrosoftGraph': {
          return true;
        }
        case 'user.attributes.list': {
          return [
            {
              value: 'attr1',
              text: 'Attr1',
            },
          ];
        }
      }
    });
    const filter = {
      field: '{{attributes.attr2}}',
      operator: filterOperator.EQUAL_TO,
      value: 'value1',
    };
    expect(utils.checkIfRoleIsAssigned(user, filter)).toBe(false);
  });
});
