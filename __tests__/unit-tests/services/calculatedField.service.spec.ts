import { CalculatedFieldService } from '@services/calculatedField.service';
import { Resource } from '@models';

/**
 * Thin helper to keep call sites readable: most existing tests don't need a
 * resource, context, or user attributes, so we hide those behind defaults.
 *
 * @param expression Calculated-field expression in string form (e.g. `{{calc.add(1; 2)}}`)
 * @param name Target field name (result lands in `data.<name>`)
 * @param timeZone User timezone, used by date operations
 * @param userAttributes Logged-in user contextual attributes for `{{user.X}}` placeholders
 * @returns Aggregation pipeline stages produced by the service
 */
const build = (
  expression: string,
  name: string,
  timeZone = 'UTC',
  userAttributes: Record<string, unknown> = {}
) =>
  new CalculatedFieldService(null, null, timeZone, userAttributes).build(
    expression,
    name
  );

describe('CalculatedFieldService', () => {
  describe('simple operators', () => {
    it('resolves a constant number operator', async () => {
      const pipeline = await build('{{calc.add(1; 2)}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $add: [1, 2] } } },
      ]);
    });

    it('resolves a constant string operator', async () => {
      const pipeline = await build('{{calc.eq("foo"; "bar")}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $eq: ['foo', 'bar'] } } },
      ]);
    });

    it('resolves a boolean constant', async () => {
      const pipeline = await build('{{calc.and(true; false)}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $and: [true, false] } } },
      ]);
    });

    it('resolves a field operator with the $data. prefix', async () => {
      const pipeline = await build('{{calc.add({{data.x}}; 2)}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $add: ['$data.x', 2] } } },
      ]);
    });

    it('resolves info.createdAt to $createdAt', async () => {
      const pipeline = await build(
        '{{calc.eq({{info.createdAt}}; 0)}}',
        'result'
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $eq: ['$createdAt', 0] } } },
      ]);
    });

    it('resolves info.updatedAt to $modifiedAt', async () => {
      const pipeline = await build(
        '{{calc.eq({{info.updatedAt}}; 0)}}',
        'result'
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $eq: ['$modifiedAt', 0] } } },
      ]);
    });

    it('resolves info.incrementalId to $incrementalId', async () => {
      const pipeline = await build(
        '{{calc.eq({{info.incrementalId}}; 0)}}',
        'result'
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $eq: ['$incrementalId', 0] } } },
      ]);
    });

    it('treats 0 as a valid value (not nil)', async () => {
      const pipeline = await build('{{calc.add(0; 1)}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $add: [0, 1] } } },
      ]);
    });
  });

  describe('multiple-operator operations', () => {
    it('builds $add', async () => {
      const pipeline = await build('{{calc.add(1; 2; 3)}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $add: [1, 2, 3] } } },
      ]);
    });

    it('builds $multiply', async () => {
      const pipeline = await build('{{calc.mul(2; 3)}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $multiply: [2, 3] } } },
      ]);
    });

    it('builds $and / $or', async () => {
      expect(await build('{{calc.or(true; false)}}', 'r')).toEqual([
        { $addFields: { 'data.r': { $or: [true, false] } } },
      ]);
    });

    it('builds $cond from "if" using the array form', async () => {
      const pipeline = await build('{{calc.if(true; "yes"; "no")}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $cond: [true, 'yes', 'no'] } } },
      ]);
    });

    it('builds $substr', async () => {
      const pipeline = await build('{{calc.substr("hello"; 1; 3)}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $substr: ['hello', 1, 3] } } },
      ]);
    });

    describe('concat string conversion', () => {
      it('wraps a plain constant in a simple $convert', async () => {
        const pipeline = await build('{{calc.concat("a"; "b")}}', 'result');
        expect(pipeline).toEqual([
          {
            $addFields: {
              'data.result': {
                $concat: [
                  {
                    $convert: {
                      input: 'a',
                      to: 'string',
                      onError: '',
                      onNull: '',
                    },
                  },
                  {
                    $convert: {
                      input: 'b',
                      to: 'string',
                      onError: '',
                      onNull: '',
                    },
                  },
                ],
              },
            },
          },
        ]);
      });

      it('wraps a field reference with a date-aware $cond branch', async () => {
        const pipeline = await build(
          '{{calc.concat({{data.x}}; "b")}}',
          'result'
        );
        expect(pipeline).toEqual([
          {
            $addFields: {
              'data.result': {
                $concat: [
                  {
                    $cond: {
                      if: { $eq: [{ $type: '$data.x' }, 'date'] },
                      then: {
                        $dateToString: {
                          format: '%Y-%m-%d',
                          date: '$data.x',
                        },
                      },
                      else: {
                        $convert: {
                          input: '$data.x',
                          to: 'string',
                          onError: '',
                          onNull: '',
                        },
                      },
                    },
                  },
                  {
                    $convert: {
                      input: 'b',
                      to: 'string',
                      onError: '',
                      onNull: '',
                    },
                  },
                ],
              },
            },
          },
        ]);
      });
    });
  });

  describe('double-operator operations', () => {
    it('builds $subtract', async () => {
      const pipeline = await build('{{calc.sub(5; 2)}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $subtract: [5, 2] } } },
      ]);
    });

    it('builds $divide', async () => {
      const pipeline = await build('{{calc.div(10; 2)}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $divide: [10, 2] } } },
      ]);
    });

    it.each([
      ['gte', '$gte'],
      ['gt', '$gt'],
      ['lte', '$lte'],
      ['lt', '$lt'],
      ['eq', '$eq'],
      ['ne', '$ne'],
    ])('builds %s comparison as %s', async (op, mongoOp) => {
      const pipeline = await build(`{{calc.${op}(1; 2)}}`, 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { [mongoOp]: [1, 2] } } },
      ]);
    });

    it('builds $dateDiff in minutes from two date operands', async () => {
      const pipeline = await build(
        '{{calc.datediff({{data.start}}; {{data.end}})}}',
        'result'
      );
      expect(pipeline).toEqual([
        {
          $addFields: {
            'data.result': {
              $dateDiff: {
                startDate: { $toDate: '$data.start' },
                endDate: { $toDate: '$data.end' },
                unit: 'minute',
              },
            },
          },
        },
      ]);
    });

    it('builds includes with an isArray guard', async () => {
      const pipeline = await build(
        '{{calc.includes({{data.arr}}; "x")}}',
        'result'
      );
      expect(pipeline).toEqual([
        {
          $addFields: {
            'data.result': {
              $cond: {
                if: { $isArray: '$data.arr' },
                then: { $in: ['x', '$data.arr'] },
                else: false,
              },
            },
          },
        },
      ]);
    });

    describe('join', () => {
      it('reduces an array field to a separator-joined string', async () => {
        const pipeline = await build(
          '{{calc.join({{data.tags}}; ", ")}}',
          'result'
        );
        expect(pipeline).toEqual([
          {
            $addFields: {
              'data.result': {
                $let: {
                  vars: {
                    joinReduced: {
                      $reduce: {
                        input: {
                          $cond: {
                            if: { $isArray: '$data.tags' },
                            then: '$data.tags',
                            else: [],
                          },
                        },
                        initialValue: { i: 0, s: '' },
                        in: {
                          i: { $add: ['$$value.i', 1] },
                          s: {
                            $concat: [
                              '$$value.s',
                              {
                                $cond: {
                                  if: { $eq: ['$$value.i', 0] },
                                  then: '',
                                  else: {
                                    $convert: {
                                      input: ', ',
                                      to: 'string',
                                      onError: '',
                                      onNull: '',
                                    },
                                  },
                                },
                              },
                              {
                                $convert: {
                                  input: '$$this',
                                  to: 'string',
                                  onError: '',
                                  onNull: '',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                  in: '$$joinReduced.s',
                },
              },
            },
          },
        ]);
      });

      it('wraps non-array input as [] inside the reduce', async () => {
        const pipeline = await build(
          '{{calc.join({{data.notArray}}; "-")}}',
          'result'
        );
        const stage = (pipeline[0] as any).$addFields['data.result'];
        expect(stage.$let.vars.joinReduced.$reduce.input).toEqual({
          $cond: {
            if: { $isArray: '$data.notArray' },
            then: '$data.notArray',
            else: [],
          },
        });
      });

      it('emits an aux dependency when the array operand is a nested expression', async () => {
        const pipeline = await build(
          '{{calc.join({{calc.if(true; {{data.a}}; {{data.b}})}}; "-")}}',
          'result'
        );
        expect(pipeline.length).toBeGreaterThanOrEqual(2);
        const last = pipeline[pipeline.length - 1] as any;
        const stage = last.$addFields['data.result'];
        expect(stage.$let.vars.joinReduced.$reduce.input).toEqual({
          $cond: {
            if: { $isArray: '$aux.result-join1' },
            then: '$aux.result-join1',
            else: [],
          },
        });
      });
    });
  });

  describe('single-operator operations', () => {
    it('builds $toBool for exists', async () => {
      const pipeline = await build('{{calc.exists({{data.x}})}}', 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $toBool: '$data.x' } } },
      ]);
    });

    it.each([
      ['toInt', '$toInt'],
      ['toLong', '$toLong'],
    ])('builds %s as %s', async (op, mongoOp) => {
      const pipeline = await build(`{{calc.${op}({{data.x}})}}`, 'result');
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { [mongoOp]: '$data.x' } } },
      ]);
    });

    it('wraps size with an isArray guard', async () => {
      const pipeline = await build('{{calc.size({{data.arr}})}}', 'result');
      expect(pipeline).toEqual([
        {
          $addFields: {
            'data.result': {
              $size: {
                $cond: {
                  if: { $isArray: '$data.arr' },
                  then: '$data.arr',
                  else: [],
                },
              },
            },
          },
        },
      ]);
    });

    it('builds date using $toDate inside a $convert', async () => {
      const pipeline = await build('{{calc.date({{data.x}})}}', 'result');
      expect(pipeline).toEqual([
        {
          $addFields: {
            'data.result': {
              $toDate: {
                $convert: {
                  input: '$data.x',
                  to: 'date',
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
        },
      ]);
    });

    it.each([
      'year',
      'month',
      'day',
      'hour',
      'minute',
      'second',
      'millisecond',
    ])(
      'extracts %s using $dateToParts with the user timezone',
      async (part) => {
        const tz = 'Europe/Paris';
        const pipeline = await build(
          `{{calc.${part}({{data.dt}})}}`,
          'result',
          tz
        );
        expect(pipeline).toEqual([
          {
            $addFields: {
              'data.result': {
                $getField: {
                  field: part,
                  input: {
                    $dateToParts: {
                      date: { $toDate: '$data.dt' },
                      timezone: tz,
                    },
                  },
                },
              },
            },
          },
        ]);
      }
    );
  });

  describe('today operator', () => {
    it('returns $$NOW when called without an operand', async () => {
      const pipeline = await build('{{calc.today()}}', 'result');
      expect(pipeline).toEqual([{ $addFields: { 'data.result': '$$NOW' } }]);
    });

    it('adds an offset in days when called with a numeric operand', async () => {
      const pipeline = await build('{{calc.today(5)}}', 'result');
      expect(pipeline).toEqual([
        {
          $addFields: {
            'data.result': {
              $add: ['$$NOW', { $multiply: [5, 86400000] }],
            },
          },
        },
      ]);
    });

    it('supports a field reference as the offset operand', async () => {
      const pipeline = await build('{{calc.today({{data.offset}})}}', 'result');
      expect(pipeline).toEqual([
        {
          $addFields: {
            'data.result': {
              $add: ['$$NOW', { $multiply: ['$data.offset', 86400000] }],
            },
          },
        },
      ]);
    });
  });

  describe('nested expressions (dependencies)', () => {
    it('emits the dependency stage before the consuming stage', async () => {
      const pipeline = await build(
        '{{calc.add({{calc.mul(2; 3)}}; 1)}}',
        'result'
      );
      expect(pipeline).toEqual([
        { $addFields: { 'aux.result-add0': { $multiply: [2, 3] } } },
        {
          $addFields: {
            'data.result': { $add: ['$aux.result-add0', 1] },
          },
        },
      ]);
    });

    it('numbers dependency aux paths by operator position for double operators', async () => {
      const pipeline = await build(
        '{{calc.sub({{calc.add(1; 2)}}; {{calc.add(3; 4)}})}}',
        'result'
      );
      expect(pipeline).toEqual([
        { $addFields: { 'aux.result-sub2': { $add: [3, 4] } } },
        { $addFields: { 'aux.result-sub1': { $add: [1, 2] } } },
        {
          $addFields: {
            'data.result': {
              $subtract: ['$aux.result-sub1', '$aux.result-sub2'],
            },
          },
        },
      ]);
    });

    it('handles deeply nested dependencies without re-prefixing aux paths', async () => {
      const pipeline = await build(
        '{{calc.add({{calc.mul({{calc.sub(10; 1)}}; 2)}}; 1)}}',
        'result'
      );
      expect(pipeline).toEqual([
        {
          $addFields: {
            'aux.result-add0-mul0': { $subtract: [10, 1] },
          },
        },
        {
          $addFields: {
            'aux.result-add0': {
              $multiply: ['$aux.result-add0-mul0', 2],
            },
          },
        },
        {
          $addFields: {
            'data.result': { $add: ['$aux.result-add0', 1] },
          },
        },
      ]);
    });

    it('emits an aux dependency for a nested today() offset', async () => {
      const pipeline = await build(
        '{{calc.today({{calc.add(1; 2)}})}}',
        'result'
      );
      expect(pipeline).toEqual([
        { $addFields: { 'aux.result-today': { $add: [1, 2] } } },
        {
          $addFields: {
            'data.result': {
              $add: ['$$NOW', { $multiply: ['$aux.result-today', 86400000] }],
            },
          },
        },
      ]);
    });
  });

  describe('user contextual attributes', () => {
    const STANDARD_ATTRIBUTES = [
      'country',
      'region',
      'location',
      'department',
    ] as const;

    const userAttributes = {
      country: 'France',
      region: 'Europe',
      location: 'Paris',
      department: 'Engineering',
    };

    it.each(STANDARD_ATTRIBUTES)(
      'resolves a direct {{user.%s}} placeholder to the attribute value',
      async (attr) => {
        const pipeline = await build(
          `{{user.${attr}}}`,
          'result',
          'UTC',
          userAttributes
        );
        expect(pipeline).toEqual([
          { $addFields: { 'data.result': userAttributes[attr] } },
        ]);
      }
    );

    it.each(STANDARD_ATTRIBUTES)(
      'inlines {{user.%s}} as a constant inside a double operator',
      async (attr) => {
        const pipeline = await build(
          `{{calc.eq({{user.${attr}}}; "target")}}`,
          'result',
          'UTC',
          userAttributes
        );
        expect(pipeline).toEqual([
          {
            $addFields: {
              'data.result': { $eq: [userAttributes[attr], 'target'] },
            },
          },
        ]);
      }
    );

    it('inlines a user attribute inside a multi-operator concat', async () => {
      const pipeline = await build(
        '{{calc.concat({{user.country}}; "-"; {{user.department}})}}',
        'label',
        'UTC',
        userAttributes
      );
      expect(pipeline).toEqual([
        {
          $addFields: {
            'data.label': {
              $concat: [
                {
                  $convert: {
                    input: 'France',
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                },
                {
                  $convert: {
                    input: '-',
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                },
                {
                  $convert: {
                    input: 'Engineering',
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                },
              ],
            },
          },
        },
      ]);
    });

    it('mixes a user attribute with a data field reference', async () => {
      const pipeline = await build(
        '{{calc.eq({{user.region}}; {{data.region}})}}',
        'matchesRegion',
        'UTC',
        userAttributes
      );
      expect(pipeline).toEqual([
        {
          $addFields: {
            'data.matchesRegion': { $eq: ['Europe', '$data.region'] },
          },
        },
      ]);
    });

    it.each(STANDARD_ATTRIBUTES)(
      'falls back to "" when {{user.%s}} is missing from userAttributes',
      async (attr) => {
        const pipeline = await build(`{{user.${attr}}}`, 'result', 'UTC', {});
        expect(pipeline).toEqual([{ $addFields: { 'data.result': '' } }]);
      }
    );

    it('falls back to "" for missing user attributes inside an expression', async () => {
      const pipeline = await build(
        '{{calc.concat({{user.country}}; "-"; {{user.department}})}}',
        'label',
        'UTC',
        {}
      );
      expect(pipeline).toEqual([
        {
          $addFields: {
            'data.label': {
              $concat: [
                {
                  $convert: {
                    input: '',
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                },
                {
                  $convert: {
                    input: '-',
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                },
                {
                  $convert: {
                    input: '',
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                },
              ],
            },
          },
        },
      ]);
    });

    it('falls back to "" when userAttributes is not passed at all', async () => {
      const pipeline = await build('{{user.country}}', 'result');
      expect(pipeline).toEqual([{ $addFields: { 'data.result': '' } }]);
    });
  });

  describe('field naming', () => {
    it('writes the result under data.<name>', async () => {
      const pipeline = await build('{{calc.add(1; 2)}}', 'myField');
      expect(Object.keys((pipeline[0] as any).$addFields)).toContain(
        'data.myField'
      );
    });
  });

  describe('calc.displayValue (static choices)', () => {
    const resource = {
      name: 'tasks',
      fields: [
        {
          name: 'country',
          choices: [
            { value: 'FR', text: 'France' },
            { value: 'DE', text: 'Germany' },
          ],
        },
      ],
    };

    it('emits a value→label lookup stage using the field choice map', async () => {
      const pipeline = await new CalculatedFieldService(
        resource,
        null,
        'UTC'
      ).build("{{calc.displayValue('country')}}", 'result');

      expect(pipeline).toHaveLength(1);
      const stage = (pipeline[0] as any).$addFields['data.result'];
      expect(stage.$let.vars.dvValues).toEqual(['FR', 'DE']);
      expect(stage.$let.vars.dvTexts).toEqual(['France', 'Germany']);
      expect(stage.$let.in.$cond.if).toEqual({ $isArray: '$data.country' });
    });

    it('normalizes numeric choice values and coerces the stored value to string so 4 matches "4"', async () => {
      const numericResource = {
        name: 'tasks',
        fields: [
          {
            name: 'rating',
            choices: [
              { value: 4, text: 'Good' },
              { value: 5, text: 'Great' },
            ],
          },
        ],
      };
      const pipeline = await new CalculatedFieldService(
        numericResource,
        null,
        'UTC'
      ).build("{{calc.displayValue('rating')}}", 'result');

      const stage = (pipeline[0] as any).$addFields['data.result'];
      // Choice values are stringified at build time so the $indexOfArray comparison is type-stable
      expect(stage.$let.vars.dvValues).toEqual(['4', '5']);
      // The stored value is $convert-ed to string inside the lookup so a stored 4 matches a choice "4"
      const scalarLookup = stage.$let.in.$cond.else;
      expect(scalarLookup.$let.vars.dvIdx.$indexOfArray[1]).toEqual({
        $convert: {
          input: '$data.rating',
          to: 'string',
          onError: '$data.rating',
          onNull: null,
        },
      });
    });

    it('composes inside calc.concat by emitting an aux dependency first', async () => {
      const pipeline = await new CalculatedFieldService(
        resource,
        null,
        'UTC'
      ).build(
        "{{calc.concat('Hello, '; {{calc.displayValue('country')}})}}",
        'greeting'
      );
      expect(pipeline).toHaveLength(2);
      expect(Object.keys((pipeline[0] as any).$addFields)[0]).toBe(
        'aux.greeting-concat1'
      );
      // concat wraps the aux reference in a date-aware $cond
      expect(
        (pipeline[1] as any).$addFields['data.greeting'].$concat[1].$cond.else
          .$convert.input
      ).toBe('$aux.greeting-concat1');
    });

    it('throws when called against an unknown field', async () => {
      await expect(
        new CalculatedFieldService(resource, null, 'UTC').build(
          "{{calc.displayValue('unknownField')}}",
          'result'
        )
      ).rejects.toThrow(/unknown field/);
    });

    it('rejects an unquoted argument at parse time', async () => {
      await expect(
        new CalculatedFieldService(resource, null, 'UTC').build(
          '{{calc.displayValue(country)}}',
          'result'
        )
      ).rejects.toThrow(/quoted field name/);
    });
  });

  describe('calc.related* (related-resource aggregations)', () => {
    /** The resource holding the calculated field */
    const organization = {
      _id: 'orgResourceId',
      name: 'organization',
      fields: [{ name: 'name' }],
    };
    /** A resource whose records point back at organization records */
    const team = {
      _id: 'teamResourceId',
      name: 'team',
      fields: [
        {
          name: 'organization',
          type: 'resource',
          resource: 'orgResourceId',
          relatedName: 'teams',
        },
        { name: 'active', type: 'boolean' },
        { name: 'grade', type: 'numeric' },
        { name: 'graded_on', type: 'datetime' },
        { name: 'country', type: 'resource', resource: 'countryResourceId' },
      ],
    };

    let findSpy: jest.SpyInstance;

    beforeEach(() => {
      findSpy = jest.spyOn(Resource, 'find').mockResolvedValue([team] as any);
    });

    afterEach(() => {
      findSpy.mockRestore();
    });

    const buildRelated = (expression: string, name: string) =>
      new CalculatedFieldService(organization, null, 'UTC').build(
        expression,
        name
      );

    it('resolves the reverse link by querying resources pointing at this one', async () => {
      await buildRelated("{{calc.relatedCount('teams')}}", 'team_count');
      expect(findSpy).toHaveBeenCalledWith(
        {
          fields: {
            $elemMatch: { resource: 'orgResourceId', relatedName: 'teams' },
          },
        },
        { name: 1, fields: 1 }
      );
    });

    it('compiles relatedCount to a $lookup counting the linked child records', async () => {
      const pipeline = await buildRelated(
        "{{calc.relatedCount('teams')}}",
        'team_count'
      );
      expect(pipeline).toEqual([
        { $addFields: { __recordId: { $toString: '$_id' } } },
        {
          $lookup: {
            from: 'records',
            localField: '__recordId',
            foreignField: 'data.organization',
            as: 'aux.team_count_related',
            pipeline: [
              {
                $match: {
                  resource: 'teamResourceId',
                  archived: { $ne: true },
                },
              },
              { $count: 'v' },
            ],
          },
        },
        {
          $addFields: {
            'data.team_count': {
              $ifNull: [
                { $arrayElemAt: ['$aux.team_count_related.v', 0] },
                0,
              ],
            },
          },
        },
      ]);
    });

    it('compiles relatedValue to a sorted, limited $lookup extracting one value', async () => {
      const pipeline = await buildRelated(
        "{{calc.relatedValue('teams'; 'grade'; 'graded_on'; 'desc')}}",
        'latest_grade'
      );
      expect(pipeline).toHaveLength(3);
      const lookup = (pipeline[1] as any).$lookup;
      expect(lookup.pipeline).toEqual([
        {
          $match: { resource: 'teamResourceId', archived: { $ne: true } },
        },
        { $sort: { 'data.graded_on': -1, _id: -1 } },
        { $limit: 1 },
        { $project: { _id: 0, v: '$data.grade' } },
      ]);
      expect((pipeline[2] as any).$addFields['data.latest_grade']).toEqual({
        $ifNull: [{ $arrayElemAt: ['$aux.latest_grade_related.v', 0] }, null],
      });
    });

    it('sorts ascending when sortOrder is asc', async () => {
      const pipeline = await buildRelated(
        "{{calc.relatedValue('teams'; 'grade'; 'graded_on'; 'asc')}}",
        'initial_grade'
      );
      expect((pipeline[1] as any).$lookup.pipeline[1]).toEqual({
        $sort: { 'data.graded_on': 1, _id: 1 },
      });
    });

    it('maps record-level info fields to their top-level path', async () => {
      const pipeline = await buildRelated(
        "{{calc.relatedValue('teams'; 'grade'; 'createdAt'; 'desc')}}",
        'latest_grade'
      );
      expect((pipeline[1] as any).$lookup.pipeline[1]).toEqual({
        $sort: { createdAt: -1, _id: -1 },
      });
    });

    it('compiles relatedExists to a limited $lookup and a size check', async () => {
      const pipeline = await buildRelated(
        "{{calc.relatedExists('teams')}}",
        'has_teams'
      );
      expect((pipeline[1] as any).$lookup.pipeline).toEqual([
        {
          $match: { resource: 'teamResourceId', archived: { $ne: true } },
        },
        { $limit: 1 },
        { $project: { _id: 1 } },
      ]);
      expect((pipeline[2] as any).$addFields['data.has_teams']).toEqual({
        $gt: [{ $size: '$aux.has_teams_related' }, 0],
      });
    });

    it.each([
      ['relatedSum', '$sum', 0],
      ['relatedMin', '$min', null],
      ['relatedMax', '$max', null],
      ['relatedAvg', '$avg', null],
    ])(
      'compiles %s to a $lookup grouping with %s',
      async (op, groupOperator, fallback) => {
        const pipeline = await buildRelated(
          `{{calc.${op}('teams'; 'grade')}}`,
          'result'
        );
        expect((pipeline[1] as any).$lookup.pipeline[1]).toEqual({
          $group: { _id: null, v: { [groupOperator]: '$data.grade' } },
        });
        expect((pipeline[2] as any).$addFields['data.result']).toEqual({
          $ifNull: [{ $arrayElemAt: ['$aux.result_related.v', 0] }, fallback],
        });
      }
    );

    it('applies the optional filter argument inside the $lookup match', async () => {
      const pipeline = await buildRelated(
        '{{calc.relatedCount(\'teams\'; \'{"field":"active","operator":"eq","value":true}\')}}',
        'active_teams'
      );
      const match = (pipeline[1] as any).$lookup.pipeline[0].$match;
      expect(match.$and).toHaveLength(2);
      expect(match.$and[0]).toEqual({
        resource: 'teamResourceId',
        archived: { $ne: true },
      });
      expect(JSON.stringify(match.$and[1])).toContain('data.active');
    });

    it('joins the child linked record inside the sub-pipeline to filter on a resource subfield', async () => {
      findSpy.mockImplementation((query: any) =>
        Promise.resolve(
          query._id
            ? [
                {
                  _id: 'countryResourceId',
                  fields: [{ name: 'name', type: 'text' }],
                },
              ]
            : [team]
        )
      );
      const pipeline = await buildRelated(
        '{{calc.relatedCount(\'teams\'; \'{"field":"country.name","operator":"eq","value":"France"}\')}}',
        'french_teams'
      );
      // The fields of the linked resource are prefetched to type the filter
      expect(findSpy).toHaveBeenCalledWith(
        { _id: { $in: ['countryResourceId'] } },
        { fields: 1 }
      );
      expect((pipeline[1] as any).$lookup.pipeline).toEqual([
        { $match: { resource: 'teamResourceId', archived: { $ne: true } } },
        {
          $addFields: {
            'data.country_id': {
              $convert: {
                input: '$data.country',
                to: 'objectId',
                onError: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: 'records',
            localField: 'data.country_id',
            foreignField: '_id',
            as: '_country',
          },
        },
        { $unwind: { path: '$_country', preserveNullAndEmptyArrays: true } },
        { $addFields: { '_country.id': { $toString: '$_country._id' } } },
        { $match: { '_country.data.name': { $eq: 'France' } } },
        { $count: 'v' },
      ]);
    });

    it('composes inside another operation by emitting the $lookup as an aux dependency', async () => {
      const pipeline = await buildRelated(
        "{{calc.gt({{calc.relatedCount('teams')}}; 0)}}",
        'is_big'
      );
      // dependency stages first (addFields + lookup + extract), then the comparison
      expect(pipeline).toHaveLength(4);
      expect((pipeline[1] as any).$lookup.as).toBe('aux.aux_is_big_gt1_related');
      expect((pipeline[2] as any).$addFields['aux.is_big-gt1']).toBeDefined();
      expect((pipeline[3] as any).$addFields['data.is_big']).toEqual({
        $gt: ['$aux.is_big-gt1', 0],
      });
    });

    describe('forward links (resource(s) fields of the current resource)', () => {
      /** Resource holding the calculated field AND the link field */
      const emergency = {
        _id: 'emergencyResourceId',
        name: 'emergency',
        fields: [
          {
            name: 'grade_history',
            type: 'resources',
            resource: 'gradeResourceId',
            relatedName: 'emergency_grade',
          },
        ],
      };
      const gradeResource = {
        _id: 'gradeResourceId',
        name: 'grade',
        fields: [
          { name: 'grades', type: 'text' },
          { name: 'grading_date', type: 'date' },
        ],
      };

      let findByIdSpy: jest.SpyInstance;

      beforeEach(() => {
        findByIdSpy = jest
          .spyOn(Resource, 'findById')
          .mockResolvedValue(gradeResource as any);
      });

      afterEach(() => {
        findByIdSpy.mockRestore();
      });

      it('resolves the link from the field name, without scanning other resources', async () => {
        await new CalculatedFieldService(emergency, null, 'UTC').build(
          "{{calc.relatedValue('grade_history'; 'grades'; 'grading_date'; 'desc')}}",
          'latest_grade'
        );
        expect(findByIdSpy).toHaveBeenCalledWith('gradeResourceId', {
          name: 1,
          fields: 1,
        });
        expect(findSpy).not.toHaveBeenCalled();
      });

      it('joins on the stored record ids, converted to ObjectIds', async () => {
        const pipeline = await new CalculatedFieldService(
          emergency,
          null,
          'UTC'
        ).build(
          "{{calc.relatedValue('grade_history'; 'grades'; 'grading_date'; 'desc')}}",
          'latest_grade'
        );
        expect(pipeline).toHaveLength(3);
        const stored = '$data.grade_history';
        expect(
          (pipeline[0] as any).$addFields['aux.latest_grade_related_ids']
        ).toEqual({
          $map: {
            input: {
              $cond: {
                if: { $isArray: stored },
                then: stored,
                else: {
                  $cond: {
                    if: { $eq: [stored, null] },
                    then: [],
                    else: [stored],
                  },
                },
              },
            },
            as: 'relId',
            in: {
              $convert: { input: '$$relId', to: 'objectId', onError: null },
            },
          },
        });
        expect((pipeline[1] as any).$lookup).toEqual({
          from: 'records',
          localField: 'aux.latest_grade_related_ids',
          foreignField: '_id',
          as: 'aux.latest_grade_related',
          pipeline: [
            {
              $match: { resource: 'gradeResourceId', archived: { $ne: true } },
            },
            { $sort: { 'data.grading_date': -1, _id: -1 } },
            { $limit: 1 },
            { $project: { _id: 0, v: '$data.grades' } },
          ],
        });
      });

      it('throws when the targeted resource does not exist', async () => {
        findByIdSpy.mockResolvedValue(null);
        await expect(
          new CalculatedFieldService(emergency, null, 'UTC').build(
            "{{calc.relatedCount('grade_history')}}",
            'result'
          )
        ).rejects.toThrow(/does not exist/);
      });
    });

    it('combines two different related names in one expression', async () => {
      const expert = {
        _id: 'expertResourceId',
        name: 'expert',
        fields: [
          {
            name: 'organizations',
            type: 'resources',
            resource: 'orgResourceId',
            relatedName: 'experts',
          },
        ],
      };
      findSpy.mockImplementation((query: any) =>
        Promise.resolve(
          query.fields.$elemMatch.relatedName === 'teams' ? [team] : [expert]
        )
      );
      const pipeline = await buildRelated(
        "{{calc.gt({{calc.relatedCount('teams')}}; {{calc.relatedCount('experts')}})}}",
        'more_teams'
      );
      const lookups = pipeline.filter((s: any) => s.$lookup);
      expect(lookups.map((s: any) => s.$lookup.foreignField).sort()).toEqual([
        'data.organization',
        'data.organizations',
      ]);
      const last = pipeline[pipeline.length - 1] as any;
      expect(last.$addFields['data.more_teams']).toEqual({
        $gt: ['$aux.more_teams-gt1', '$aux.more_teams-gt2'],
      });
    });

    it('composes as an if condition', async () => {
      const pipeline = await buildRelated(
        "{{calc.if({{calc.relatedExists('teams')}}; 'active'; 'inactive')}}",
        'state'
      );
      expect(pipeline).toHaveLength(4);
      const last = pipeline[pipeline.length - 1] as any;
      expect(last.$addFields['data.state']).toEqual({
        $cond: ['$aux.state-if0', 'active', 'inactive'],
      });
    });

    it('combines a filter with an info sort field', async () => {
      const pipeline = await buildRelated(
        '{{calc.relatedValue(\'teams\'; \'grade\'; \'createdAt\'; \'desc\'; \'{"field":"active","operator":"eq","value":true}\')}}',
        'latest_active_grade'
      );
      const sub = (pipeline[1] as any).$lookup.pipeline;
      expect(sub[0].$match.$and).toHaveLength(2);
      expect(sub[1]).toEqual({ $sort: { createdAt: -1, _id: -1 } });
      expect(sub[2]).toEqual({ $limit: 1 });
    });

    it('throws when the related name cannot be resolved', async () => {
      findSpy.mockResolvedValue([] as any);
      await expect(
        buildRelated("{{calc.relatedCount('unknown')}}", 'result')
      ).rejects.toThrow(/unknown related name/);
    });

    it('throws when the related name is ambiguous', async () => {
      findSpy.mockResolvedValue([
        team,
        { ...team, _id: 'otherResourceId', name: 'squad' },
      ] as any);
      await expect(
        buildRelated("{{calc.relatedCount('teams')}}", 'result')
      ).rejects.toThrow(/ambiguous related name/);
    });

    it('throws when the value field does not exist on the related resource', async () => {
      await expect(
        buildRelated(
          "{{calc.relatedValue('teams'; 'unknownField'; 'graded_on'; 'desc')}}",
          'result'
        )
      ).rejects.toThrow(/unknown field "unknownField"/);
    });

    it('throws when the resource has no _id', async () => {
      await expect(
        new CalculatedFieldService(
          { name: 'organization', fields: [] },
          null,
          'UTC'
        ).build("{{calc.relatedCount('teams')}}", 'result')
      ).rejects.toThrow(/_id/);
    });

    it('rejects an invalid sortOrder at parse time', async () => {
      await expect(
        buildRelated(
          "{{calc.relatedValue('teams'; 'grade'; 'graded_on'; 'newest')}}",
          'result'
        )
      ).rejects.toThrow(/sortOrder/);
    });

    it('rejects an unquoted argument at parse time', async () => {
      await expect(
        buildRelated('{{calc.relatedCount(teams)}}', 'result')
      ).rejects.toThrow(/quoted string/);
    });

    it('rejects an invalid filter JSON at parse time', async () => {
      await expect(
        buildRelated("{{calc.relatedCount('teams'; 'not json')}}", 'result')
      ).rejects.toThrow(/valid JSON/);
    });

    it('rejects a wrong number of arguments at parse time', async () => {
      await expect(
        buildRelated("{{calc.relatedValue('teams'; 'grade')}}", 'result')
      ).rejects.toThrow(/number of arguments/);
    });

    describe('hasRelatedOperation', () => {
      it('detects related operations in an expression', () => {
        expect(
          CalculatedFieldService.hasRelatedOperation(
            "{{calc.relatedCount('teams')}}"
          )
        ).toBe(true);
        expect(
          CalculatedFieldService.hasRelatedOperation(
            "{{calc.gt({{calc.relatedSum('teams'; 'grade')}}; 10)}}"
          )
        ).toBe(true);
      });

      it('returns false for expressions without related operations', () => {
        expect(
          CalculatedFieldService.hasRelatedOperation('{{calc.add(1; 2)}}')
        ).toBe(false);
      });
    });

    describe('getExpressionType', () => {
      const service = () =>
        new CalculatedFieldService(organization, null, 'UTC');

      it('derives the type of relatedValue from the child value field', async () => {
        expect(
          await service().getExpressionType(
            "{{calc.relatedValue('teams'; 'graded_on'; 'createdAt'; 'desc')}}"
          )
        ).toBe('date');
        expect(
          await service().getExpressionType(
            "{{calc.relatedValue('teams'; 'grade'; 'createdAt'; 'desc')}}"
          )
        ).toBe('numeric');
        expect(
          await service().getExpressionType(
            "{{calc.relatedValue('teams'; 'organization'; 'createdAt'; 'desc')}}"
          )
        ).toBe('text');
      });

      it('uses the static operation type for the other operations', async () => {
        expect(
          await service().getExpressionType("{{calc.relatedCount('teams')}}")
        ).toBe('numeric');
        expect(
          await service().getExpressionType("{{calc.relatedExists('teams')}}")
        ).toBe('boolean');
        expect(await service().getExpressionType('{{calc.add(1; 2)}}')).toBe(
          'numeric'
        );
      });
    });
  });
});
