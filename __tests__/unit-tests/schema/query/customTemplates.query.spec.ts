import { CustomTemplate } from '@models/customTemplate.model';
import { graphQLAuthCheck } from '@schema/shared';
import resolver from '@schema/query/customTemplates.query';
import { Context } from '@server/apollo/context';

jest.mock('@models/customTemplate.model', () => ({
  CustomTemplate: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));
jest.mock('@schema/shared');
jest.mock('@services/logger.service');

describe('CustomTemplates Query Resolver', () => {
  const context = {
    i18next: {
      t: jest.fn((key: string) => key),
    },
  } as unknown as Context;

  beforeEach(() => {
    jest.resetAllMocks();
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => undefined);
  });

  it('filters templates by the requested IDs', async () => {
    const templates = [
      {
        _id: 'template-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ];
    const limit = jest.fn().mockResolvedValue(templates);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    (CustomTemplate.find as jest.Mock).mockReturnValue({ sort });
    (CustomTemplate.countDocuments as jest.Mock).mockResolvedValue(1);

    const args = {
      applicationId: 'application-1',
      ids: ['template-1', 'template-2'],
      isFromEmailNotification: false,
      limit: 0,
      skip: 0,
    };
    const result = await resolver.resolve(null, args, context);
    const expectedQuery = {
      _id: { $in: args.ids },
      applicationId: args.applicationId,
      isDeleted: { $ne: 1 },
      isFromEmailNotification: { $ne: true },
    };

    expect(CustomTemplate.find).toHaveBeenCalledWith(expectedQuery);
    expect(CustomTemplate.countDocuments).toHaveBeenCalledWith(expectedQuery);
    expect(result.edges).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it('returns no templates when an empty ID list is requested', async () => {
    const limit = jest.fn().mockResolvedValue([]);
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    (CustomTemplate.find as jest.Mock).mockReturnValue({ sort });
    (CustomTemplate.countDocuments as jest.Mock).mockResolvedValue(0);

    const args = {
      ids: [],
      limit: 0,
      skip: 0,
    };
    const result = await resolver.resolve(null, args, context);

    expect(CustomTemplate.find).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $in: [] } })
    );
    expect(result.pageInfo.hasNextPage).toBe(false);
  });
});
