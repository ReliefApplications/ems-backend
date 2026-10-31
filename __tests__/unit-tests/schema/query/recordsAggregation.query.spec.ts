import { GraphQLError } from 'graphql';
import { Resource } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import resolver from '@schema/query/recordsAggregation.query';

jest.mock('@models');
jest.mock('@schema/shared');
jest.mock('@services/logger.service');
jest.mock('@security/extendAbilityForRecords');
jest.mock('@casl/mongoose', () => ({
  ...jest.requireActual('@casl/mongoose'),
  accessibleBy: jest.fn().mockReturnValue({
    Resource: {},
    Record: {},
  }),
}));

/**
 * Builds a request context whose translator echoes the i18n key.
 *
 * @returns mocked context
 */
const mockContext = (): any => ({
  i18next: { t: jest.fn((key: string) => key) },
  user: { id: 'userId', ability: {} },
});

/** Base arguments, as sent by dashboard widgets */
const BASE_ARGS: any = {
  resource: '507f1f77bcf86cd799439011',
  aggregation: '507f1f77bcf86cd799439012',
};

describe('Records Aggregation Query - request-time pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    (Resource.find as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        getFilter: jest.fn().mockReturnValue({}),
      }),
    });
    (Resource.findById as jest.Mock).mockResolvedValue({
      id: BASE_ARGS.resource,
      fields: [],
      aggregations: [],
    });
    // Fail fast after the permission gate so the suite does not need mongo
    (extendAbilityForRecords as jest.Mock).mockRejectedValue(
      new GraphQLError('stop')
    );
  });

  it('denies a request-time pipeline to users who cannot update the resource', async () => {
    const context = mockContext();
    (Resource.exists as jest.Mock).mockResolvedValue(null);
    await expect(
      resolver.resolve(
        null,
        {
          ...BASE_ARGS,
          pipeline: [
            { type: 'custom', form: { raw: '{"$lookup":{"from":"users"}}' } },
          ],
        },
        context
      )
    ).rejects.toThrow('common.errors.permissionNotGranted');
    expect(Resource.exists).toHaveBeenCalled();
    expect(extendAbilityForRecords).not.toHaveBeenCalled();
  });

  it('denies request-time sourceFields to users who cannot update the resource', async () => {
    const context = mockContext();
    (Resource.exists as jest.Mock).mockResolvedValue(null);
    await expect(
      resolver.resolve(
        null,
        { ...BASE_ARGS, sourceFields: ['createdBy'] },
        context
      )
    ).rejects.toThrow('common.errors.permissionNotGranted');
    expect(extendAbilityForRecords).not.toHaveBeenCalled();
  });

  it('lets resource editors preview a request-time pipeline', async () => {
    const context = mockContext();
    (Resource.exists as jest.Mock).mockResolvedValue({
      _id: BASE_ARGS.resource,
    });
    await expect(
      resolver.resolve(
        null,
        {
          ...BASE_ARGS,
          pipeline: [{ type: 'custom', form: { raw: '{"$limit":1}' } }],
        },
        context
      )
    ).rejects.toThrow('stop');
    expect(context.i18next.t).not.toHaveBeenCalledWith(
      'common.errors.permissionNotGranted'
    );
    expect(extendAbilityForRecords).toHaveBeenCalledWith(context.user);
  });

  it('does not check update rights when only the stored aggregation is used', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(null, { ...BASE_ARGS, pipeline: null }, context)
    ).rejects.toThrow('stop');
    expect(Resource.exists).not.toHaveBeenCalled();
    expect(context.i18next.t).not.toHaveBeenCalledWith(
      'common.errors.permissionNotGranted'
    );
  });
});
