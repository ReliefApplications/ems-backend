import { ReferenceData, Resource } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import resolver from '@schema/mutation/editAggregation.mutation';

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

/**
 * Builds a document holding one editable aggregation sub document.
 *
 * @returns mocked parent document and its aggregation
 */
const mockParent = () => {
  const aggregation: any = { id: 'aggregationId', name: 'old', pipeline: [] };
  const parent = {
    aggregations: { id: jest.fn().mockReturnValue(aggregation) },
    save: jest.fn().mockResolvedValue(undefined),
  };
  return { parent, aggregation };
};

describe('Edit Aggregation Mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (graphQLAuthCheck as jest.Mock).mockImplementation(() => {});
    mockFindChain(Resource);
    mockFindChain(ReferenceData);
  });

  it('refuses to store a custom stage writing to another collection', async () => {
    const context = mockContext();
    const { parent } = mockParent();
    (Resource.findOne as jest.Mock).mockResolvedValue(parent);
    await expect(
      resolver.resolve(
        null,
        {
          id: 'aggregationId',
          resource: 'resourceId',
          aggregation: {
            name: 'agg',
            pipeline: [
              {
                type: 'custom',
                form: { raw: '{"$merge":{"into":"records"}}' },
              },
            ],
          },
        } as any,
        context
      )
    ).rejects.toThrow(
      'utils.aggregation.buildPipeline.errors.forbiddenCustomStage'
    );
    expect(Resource.findOne).not.toHaveBeenCalled();
    expect(parent.save).not.toHaveBeenCalled();
  });

  it('refuses a forbidden stage nested in a $facet sub pipeline', async () => {
    const context = mockContext();
    const { parent } = mockParent();
    (ReferenceData.findOne as jest.Mock).mockResolvedValue(parent);
    await expect(
      resolver.resolve(
        null,
        {
          id: 'aggregationId',
          referenceData: 'referenceDataId',
          aggregation: {
            name: 'agg',
            pipeline: [
              {
                type: 'custom',
                form: {
                  raw: JSON.stringify({
                    $facet: {
                      a: [{ $graphLookup: { from: 'users' } }],
                    },
                  }),
                },
              },
            ],
          },
        } as any,
        context
      )
    ).rejects.toThrow(
      'utils.aggregation.buildPipeline.errors.forbiddenCustomStage'
    );
    expect(parent.save).not.toHaveBeenCalled();
  });

  it('updates the aggregation when the pipeline is valid', async () => {
    const context = mockContext();
    const { parent, aggregation } = mockParent();
    (Resource.findOne as jest.Mock).mockResolvedValue(parent);
    const pipeline = [
      { type: 'custom', form: { raw: '{"$project":{"data":1}}' } },
    ];
    await expect(
      resolver.resolve(
        null,
        {
          id: 'aggregationId',
          resource: 'resourceId',
          aggregation: {
            name: 'new',
            sourceFields: ['a'],
            pipeline,
            mapping: {},
          },
        } as any,
        context
      )
    ).resolves.toBe(aggregation);
    expect(aggregation.name).toBe('new');
    expect(aggregation.pipeline).toEqual(pipeline);
    expect(aggregation.sourceFields).toEqual(['a']);
    expect(parent.save).toHaveBeenCalled();
  });

  it('updates a reference data aggregation when the pipeline is valid', async () => {
    const context = mockContext();
    const { parent, aggregation } = mockParent();
    (ReferenceData.findOne as jest.Mock).mockResolvedValue(parent);
    await expect(
      resolver.resolve(
        null,
        {
          id: 'aggregationId',
          referenceData: 'referenceDataId',
          aggregation: { name: 'new', pipeline: [] },
        } as any,
        context
      )
    ).resolves.toBe(aggregation);
    expect(parent.save).toHaveBeenCalled();
  });

  it('denies users who cannot update the reference data', async () => {
    const context = mockContext();
    (ReferenceData.findOne as jest.Mock).mockResolvedValue(null);
    await expect(
      resolver.resolve(
        null,
        {
          id: 'aggregationId',
          referenceData: 'referenceDataId',
          aggregation: { name: 'new', pipeline: [] },
        } as any,
        context
      )
    ).rejects.toThrow('common.errors.permissionNotGranted');
  });
});
