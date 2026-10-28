import {
  CustomStageError,
  CustomStageErrorCode,
  getCustomStageErrorKey,
  parseCustomStage,
  validatePipelineCustomStages,
} from '@utils/aggregation/parseCustomStage';
import { allowedCustomStageOperators } from '@const/aggregation';

/**
 * Expects parseCustomStage to reject the raw stage with the given code.
 *
 * @param raw raw custom stage
 * @param code expected error code
 * @param operator expected offending operator, if any
 */
const expectRejected = (
  raw: unknown,
  code: CustomStageErrorCode,
  operator?: string
) => {
  try {
    parseCustomStage(raw);
    throw new Error('Expected stage to be rejected');
  } catch (err) {
    expect(err).toBeInstanceOf(CustomStageError);
    expect((err as CustomStageError).code).toBe(code);
    if (operator) {
      expect((err as CustomStageError).operator).toBe(operator);
    }
  }
};

describe('parseCustomStage', () => {
  it('accepts a stage that only reshapes the current documents', () => {
    const stage = parseCustomStage(
      JSON.stringify({
        $addFields: { total: { $sum: ['$data.a', '$data.b'] } },
      })
    );
    expect(stage).toEqual({
      $addFields: { total: { $sum: ['$data.a', '$data.b'] } },
    });
  });

  it('accepts a $match using $expr on the current document', () => {
    expect(
      parseCustomStage(
        JSON.stringify({ $match: { $expr: { $gt: ['$data.a', 10] } } })
      )
    ).toEqual({ $match: { $expr: { $gt: ['$data.a', 10] } } });
  });

  it('rejects cross-collection stages', () => {
    for (const operator of ['$lookup', '$graphLookup', '$unionWith']) {
      expectRejected(
        JSON.stringify({ [operator]: { from: 'users' } }),
        CustomStageErrorCode.FORBIDDEN,
        operator
      );
    }
  });

  it('rejects stages writing to the database or injecting documents', () => {
    for (const operator of ['$out', '$merge', '$documents']) {
      expectRejected(
        JSON.stringify({ [operator]: 'records' }),
        CustomStageErrorCode.FORBIDDEN,
        operator
      );
    }
  });

  it('rejects operator names hidden behind JSON escape sequences', () => {
    // "$lookup" is "$lookup" once parsed, but does not contain the
    // substring "$lookup" in the raw string.
    const raw = '{"$\\u006cookup":{"from":"users","as":"users","pipeline":[]}}';
    expect(raw.includes('$lookup')).toBe(false);
    expectRejected(raw, CustomStageErrorCode.FORBIDDEN, '$lookup');
  });

  it('rejects server-side javascript anywhere in the stage', () => {
    expectRejected(
      JSON.stringify({
        $addFields: {
          x: { $function: { body: 'function() {}', args: [], lang: 'js' } },
        },
      }),
      CustomStageErrorCode.FORBIDDEN,
      '$function'
    );
    expectRejected(
      JSON.stringify({ $match: { $where: 'this.a > 1' } }),
      CustomStageErrorCode.FORBIDDEN,
      '$where'
    );
    expectRejected(
      JSON.stringify({
        $group: { _id: null, x: { $accumulator: { init: 'function() {}' } } },
      }),
      CustomStageErrorCode.FORBIDDEN,
      '$accumulator'
    );
  });

  it('rejects forbidden stages nested in $facet sub-pipelines', () => {
    expectRejected(
      JSON.stringify({
        $facet: {
          a: [{ $limit: 1 }],
          b: [{ $lookup: { from: 'users', as: 'u', pipeline: [] } }],
        },
      }),
      CustomStageErrorCode.FORBIDDEN,
      '$lookup'
    );
  });

  it('rejects stage operators that are not allow-listed', () => {
    expectRejected(
      JSON.stringify({ $collStats: {} }),
      CustomStageErrorCode.FORBIDDEN,
      '$collStats'
    );
    expectRejected(
      JSON.stringify({ $notAStage: {} }),
      CustomStageErrorCode.FORBIDDEN,
      '$notAStage'
    );
  });

  it('accepts every allow-listed stage operator', () => {
    for (const operator of allowedCustomStageOperators) {
      expect(parseCustomStage(JSON.stringify({ [operator]: {} }))).toEqual({
        [operator]: {},
      });
    }
  });

  it('accepts nested stages inside $facet when they are safe', () => {
    const stage = {
      $facet: {
        top: [{ $sort: { 'data.a': -1 } }, { $limit: 3 }],
        count: [{ $count: 'total' }],
      },
    };
    expect(parseCustomStage(JSON.stringify(stage))).toEqual(stage);
  });

  it('rejects forbidden operators buried deep in arrays and objects', () => {
    expectRejected(
      JSON.stringify({
        $project: {
          a: { $map: { input: [[{ $where: 'x' }]], in: '$$this' } },
        },
      }),
      CustomStageErrorCode.FORBIDDEN,
      '$where'
    );
    expectRejected(
      JSON.stringify({
        $facet: { a: [{ $facet: { b: [{ $merge: { into: 'users' } }] } }] },
      }),
      CustomStageErrorCode.FORBIDDEN,
      '$merge'
    );
  });

  it('does not match forbidden operators used as plain field values', () => {
    // Values are not operators: a string "$lookup" cannot execute anything.
    expect(
      parseCustomStage(JSON.stringify({ $addFields: { label: '$lookup' } }))
    ).toEqual({ $addFields: { label: '$lookup' } });
  });

  it('rejects malformed stages', () => {
    expectRejected('{ not json', CustomStageErrorCode.INVALID);
    expectRejected(undefined, CustomStageErrorCode.INVALID);
    expectRejected({ $limit: 1 }, CustomStageErrorCode.INVALID);
    expectRejected('[{"$limit":1}]', CustomStageErrorCode.INVALID);
    expectRejected('"$limit"', CustomStageErrorCode.INVALID);
    expectRejected(
      JSON.stringify({ $limit: 1, $skip: 1 }),
      CustomStageErrorCode.INVALID
    );
    expectRejected('{}', CustomStageErrorCode.INVALID);
  });
});

describe('validatePipelineCustomStages', () => {
  it('ignores non custom stages and accepts valid custom stages', () => {
    expect(() =>
      validatePipelineCustomStages([
        { type: 'filter', form: { logic: 'and', filters: [] } },
        { type: 'custom', form: { raw: '{"$limit":10}' } },
      ])
    ).not.toThrow();
    expect(() => validatePipelineCustomStages(undefined)).not.toThrow();
  });

  it('rejects a pipeline containing a forbidden custom stage', () => {
    expect(() =>
      validatePipelineCustomStages([
        { type: 'sort', form: { field: 'a', order: 'asc' } },
        {
          type: 'custom',
          form: { raw: '{"$unionWith":{"coll":"users"}}' },
        },
      ])
    ).toThrow(CustomStageError);
  });
});

describe('getCustomStageErrorKey', () => {
  it('maps error codes to i18n keys', () => {
    expect(
      getCustomStageErrorKey(
        new CustomStageError(CustomStageErrorCode.FORBIDDEN, '$lookup')
      )
    ).toBe('utils.aggregation.buildPipeline.errors.forbiddenCustomStage');
    expect(
      getCustomStageErrorKey(new CustomStageError(CustomStageErrorCode.INVALID))
    ).toBe('utils.aggregation.buildPipeline.errors.invalidCustomStage');
    expect(getCustomStageErrorKey(new Error('x'))).toBe(
      'utils.aggregation.buildPipeline.errors.invalidCustomStage'
    );
  });
});
