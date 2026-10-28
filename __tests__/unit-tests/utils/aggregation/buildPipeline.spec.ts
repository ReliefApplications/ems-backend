import { GraphQLError } from 'graphql';
import buildPipeline from '@utils/aggregation/buildPipeline';

/** Minimal resource used by the pipeline builder */
const RESOURCE: any = { id: 'resourceId', fields: [] };

/**
 * Builds a request context whose translator echoes the i18n key.
 *
 * @returns mocked context
 */
const mockContext = () => ({
  i18next: { t: jest.fn((key: string) => key) },
});

describe('buildPipeline - custom stage', () => {
  it('pushes a valid custom stage as a parsed object', () => {
    const pipeline: any[] = [];
    buildPipeline(
      pipeline,
      [
        {
          type: 'custom',
          form: { raw: '{"$addFields":{"total":{"$sum":"$data.a"}}}' },
        },
      ],
      RESOURCE,
      mockContext()
    );
    expect(pipeline).toEqual([{ $addFields: { total: { $sum: '$data.a' } } }]);
  });

  it('keeps custom stages in order with builder stages', () => {
    const pipeline: any[] = [];
    buildPipeline(
      pipeline,
      [
        { type: 'sort', form: { field: 'data.a', order: 'desc' } },
        { type: 'custom', form: { raw: '{"$limit":5}' } },
        { type: 'unwind', form: { field: 'data.tags' } },
      ],
      RESOURCE,
      mockContext()
    );
    expect(pipeline).toEqual([
      { $sort: { 'data.a': -1 } },
      { $limit: 5 },
      // nested fields are unwound level by level
      { $unwind: '$data' },
      { $unwind: '$data.tags' },
    ]);
  });

  it('throws a translated GraphQLError on a forbidden operator', () => {
    const context = mockContext();
    expect(() =>
      buildPipeline(
        [],
        [
          {
            type: 'custom',
            form: { raw: '{"$lookup":{"from":"users","as":"u"}}' },
          },
        ],
        RESOURCE,
        context
      )
    ).toThrow(GraphQLError);
    expect(context.i18next.t).toHaveBeenCalledWith(
      'utils.aggregation.buildPipeline.errors.forbiddenCustomStage'
    );
  });

  it('throws on operator names hidden behind JSON escape sequences', () => {
    const context = mockContext();
    expect(() =>
      buildPipeline(
        [],
        [
          {
            type: 'custom',
            form: {
              raw: '{"$\\u0075nionWith":{"coll":"users","pipeline":[]}}',
            },
          },
        ],
        RESOURCE,
        context
      )
    ).toThrow(GraphQLError);
    expect(context.i18next.t).toHaveBeenCalledWith(
      'utils.aggregation.buildPipeline.errors.forbiddenCustomStage'
    );
  });

  it('throws a translated GraphQLError on malformed JSON', () => {
    const context = mockContext();
    const pipeline: any[] = [];
    expect(() =>
      buildPipeline(
        pipeline,
        [{ type: 'custom', form: { raw: '{"$limit":' } }],
        RESOURCE,
        context
      )
    ).toThrow(GraphQLError);
    expect(context.i18next.t).toHaveBeenCalledWith(
      'utils.aggregation.buildPipeline.errors.invalidCustomStage'
    );
    expect(pipeline).toEqual([]);
  });

  it('throws when the custom stage has no raw value', () => {
    const context = mockContext();
    expect(() =>
      buildPipeline([], [{ type: 'custom', form: {} }], RESOURCE, context)
    ).toThrow(GraphQLError);
    expect(context.i18next.t).toHaveBeenCalledWith(
      'utils.aggregation.buildPipeline.errors.invalidCustomStage'
    );
  });

  it('does not push anything once a forbidden stage is met', () => {
    const pipeline: any[] = [];
    expect(() =>
      buildPipeline(
        pipeline,
        [
          { type: 'custom', form: { raw: '{"$limit":5}' } },
          { type: 'custom', form: { raw: '{"$out":"leak"}' } },
          { type: 'custom', form: { raw: '{"$skip":1}' } },
        ],
        RESOURCE,
        mockContext()
      )
    ).toThrow(GraphQLError);
    expect(pipeline).toEqual([{ $limit: 5 }]);
  });
});
