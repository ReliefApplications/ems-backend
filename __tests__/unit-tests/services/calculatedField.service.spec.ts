import { CalculatedFieldService } from '@services/calculatedField.service';

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
});
