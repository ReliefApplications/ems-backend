import { GraphQLError } from 'graphql';
import { ReferenceData, Resource } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import { logger } from '@services/logger.service';
import resolver from '@schema/mutation/addAggregation.mutation';

jest.mock('@models');
jest.mock('@schema/shared');
jest.mock('@services/logger.service');
jest.mock('@casl/mongoose', () => ({
  ...jest.requireActual('@casl/mongoose'),
  accessibleBy: jest.fn().mockReturnValue({
    Resource: {},
    ReferenceData: {},
  }),
}));

/** Custom stage joining another collection */
const FORBIDDEN_PIPELINE = [
  {
    type: 'custom',
    form: { raw: '{"$lookup":{"from":"users","as":"users","pipeline":[]}}' },
  },
];

/** Pipeline made of builder stages and a harmless custom stage */
const SAFE_PIPELINE = [
  { type: 'sort', form: { field: 'data.a', order: 'asc' } },
  { type: 'custom', form: { raw: '{"$limit":10}' } },
];

/**
 * Builds a request context whose translator echoes the i18n key.
 *
 * @returns mocked context
 */
const mockContext = (): any => ({
  i18next: { t: jest.fn((key: string) => key) },
  user: { id: 'userId', ability: {} },
});

/**
 * Mocks the model query chain `find().where().getFilter()`.
 *
 * @param model mocked model
 */
const mockFindChain = (model: any) => {
  (model.find as jest.Mock).mockReturnValue({
    where: jest.fn().mockReturnValue({
      getFilter: jest.fn().mockReturnValue({}),
    }),
  });
};

describe('Add Aggregation Mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    mockFindChain(Resource);
    mockFindChain(ReferenceData);
  });

  it('rejects a forbidden custom stage before touching the database', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        {
          resource: 'resourceId',
          aggregation: { name: 'agg', pipeline: FORBIDDEN_PIPELINE },
        } as any,
        context
      )
    ).rejects.toThrow(
      new GraphQLError(
        'utils.aggregation.buildPipeline.errors.forbiddenCustomStage'
      )
    );
    expect(Resource.findOne).not.toHaveBeenCalled();
    expect(ReferenceData.findOne).not.toHaveBeenCalled();
  });

  it('rejects a forbidden custom stage on a reference data aggregation', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        {
          referenceData: 'referenceDataId',
          aggregation: {
            name: 'agg',
            pipeline: [
              {
                type: 'custom',
                form: { raw: '{"$group":{"_id":null,"x":{"$function":{}}}}' },
              },
            ],
          },
        } as any,
        context
      )
    ).rejects.toThrow(
      'utils.aggregation.buildPipeline.errors.forbiddenCustomStage'
    );
    expect(ReferenceData.findOne).not.toHaveBeenCalled();
  });

  it('rejects an unparsable custom stage', async () => {
    const context = mockContext();
    await expect(
      resolver.resolve(
        null,
        {
          resource: 'resourceId',
          aggregation: {
            name: 'agg',
            pipeline: [{ type: 'custom', form: { raw: 'not json' } }],
          },
        } as any,
        context
      )
    ).rejects.toThrow(
      'utils.aggregation.buildPipeline.errors.invalidCustomStage'
    );
    expect(Resource.findOne).not.toHaveBeenCalled();
  });

  it('saves a valid aggregation on a resource the user can update', async () => {
    const context = mockContext();
    const aggregation = { name: 'agg', pipeline: SAFE_PIPELINE };
    const saved = { ...aggregation, id: 'aggregationId' };
    const resource = {
      aggregations: { push: jest.fn(), pop: jest.fn().mockReturnValue(saved) },
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Resource.findOne as jest.Mock).mockResolvedValue(resource);

    await expect(
      resolver.resolve(
        null,
        { resource: 'resourceId', aggregation } as any,
        context
      )
    ).resolves.toEqual(saved);
    expect(resource.aggregations.push).toHaveBeenCalledWith(aggregation);
    expect(resource.save).toHaveBeenCalled();
  });

  it('accepts an aggregation without custom stages', async () => {
    const context = mockContext();
    const aggregation = { name: 'agg', pipeline: [SAFE_PIPELINE[0]] };
    const referenceData = {
      aggregations: {
        push: jest.fn(),
        pop: jest.fn().mockReturnValue(aggregation),
      },
      save: jest.fn().mockResolvedValue(undefined),
    };
    (ReferenceData.findOne as jest.Mock).mockResolvedValue(referenceData);

    await expect(
      resolver.resolve(
        null,
        { referenceData: 'referenceDataId', aggregation } as any,
        context
      )
    ).resolves.toEqual(aggregation);
    expect(referenceData.save).toHaveBeenCalled();
  });

  it('denies users who cannot update the resource', async () => {
    const context = mockContext();
    (Resource.findOne as jest.Mock).mockResolvedValue(null);
    await expect(
      resolver.resolve(
        null,
        {
          resource: 'resourceId',
          aggregation: { name: 'agg', pipeline: SAFE_PIPELINE },
        } as any,
        context
      )
    ).rejects.toThrow('common.errors.permissionNotGranted');
    expect(logger.error).toHaveBeenCalled();
  });
});
