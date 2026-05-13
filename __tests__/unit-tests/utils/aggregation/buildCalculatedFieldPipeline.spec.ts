import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';

describe('buildCalculatedFieldPipeline', () => {
  const TZ = 'UTC';

  describe('simple operators', () => {
    it('resolves a constant number operator', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.add(1; 2)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $add: [1, 2] } } },
      ]);
    });

    it('resolves a constant string operator', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.eq("foo"; "bar")}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $eq: ['foo', 'bar'] } } },
      ]);
    });

    it('resolves a boolean constant', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.and(true; false)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $and: [true, false] } } },
      ]);
    });

    it('resolves a field operator with the $data. prefix', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.add({{data.x}}; 2)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $add: ['$data.x', 2] } } },
      ]);
    });

    it('resolves info.createdAt to $createdAt', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.eq({{info.createdAt}}; 0)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $eq: ['$createdAt', 0] } } },
      ]);
    });

    it('resolves info.updatedAt to $modifiedAt', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.eq({{info.updatedAt}}; 0)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $eq: ['$modifiedAt', 0] } } },
      ]);
    });

    it('resolves info.incrementalId to $incrementalId', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.eq({{info.incrementalId}}; 0)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $eq: ['$incrementalId', 0] } } },
      ]);
    });

    it('treats 0 as a valid value (not nil)', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.add(0; 1)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $add: [0, 1] } } },
      ]);
    });
  });

  describe('multiple-operator operations', () => {
    it('builds $add', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.add(1; 2; 3)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $add: [1, 2, 3] } } },
      ]);
    });

    it('builds $multiply', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.mul(2; 3)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $multiply: [2, 3] } } },
      ]);
    });

    it('builds $and / $or', () => {
      expect(
        buildCalculatedFieldPipeline('{{calc.or(true; false)}}', 'r', TZ)
      ).toEqual([{ $addFields: { 'data.r': { $or: [true, false] } } }]);
    });

    it('builds $cond from "if" using the array form', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.if(true; "yes"; "no")}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $cond: [true, 'yes', 'no'] } } },
      ]);
    });

    it('builds $substr', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.substr("hello"; 1; 3)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $substr: ['hello', 1, 3] } } },
      ]);
    });

    describe('concat string conversion', () => {
      it('wraps a plain constant in a simple $convert', () => {
        const pipeline = buildCalculatedFieldPipeline(
          '{{calc.concat("a"; "b")}}',
          'result',
          TZ
        );
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

      it('wraps a field reference with a date-aware $cond branch', () => {
        const pipeline = buildCalculatedFieldPipeline(
          '{{calc.concat({{data.x}}; "b")}}',
          'result',
          TZ
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
    it('builds $subtract', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.sub(5; 2)}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $subtract: [5, 2] } } },
      ]);
    });

    it('builds $divide', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.div(10; 2)}}',
        'result',
        TZ
      );
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
    ])('builds %s comparison as %s', (op, mongoOp) => {
      const pipeline = buildCalculatedFieldPipeline(
        `{{calc.${op}(1; 2)}}`,
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { [mongoOp]: [1, 2] } } },
      ]);
    });

    it('builds $dateDiff in minutes from two date operands', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.datediff({{data.start}}; {{data.end}})}}',
        'result',
        TZ
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

    it('builds includes with an isArray guard', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.includes({{data.arr}}; "x")}}',
        'result',
        TZ
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
    it('builds $toBool for exists', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.exists({{data.x}})}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { $toBool: '$data.x' } } },
      ]);
    });

    it.each([
      ['toInt', '$toInt'],
      ['toLong', '$toLong'],
    ])('builds %s as %s', (op, mongoOp) => {
      const pipeline = buildCalculatedFieldPipeline(
        `{{calc.${op}({{data.x}})}}`,
        'result',
        TZ
      );
      expect(pipeline).toEqual([
        { $addFields: { 'data.result': { [mongoOp]: '$data.x' } } },
      ]);
    });

    it('wraps size with an isArray guard', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.size({{data.arr}})}}',
        'result',
        TZ
      );
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

    it('builds date using $toDate inside a $convert', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.date({{data.x}})}}',
        'result',
        TZ
      );
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
    ])('extracts %s using $dateToParts with the user timezone', (part) => {
      const tz = 'Europe/Paris';
      const pipeline = buildCalculatedFieldPipeline(
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
    });
  });

  describe('today operator', () => {
    it('returns $$NOW when called without an operand', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.today()}}',
        'result',
        TZ
      );
      expect(pipeline).toEqual([{ $addFields: { 'data.result': '$$NOW' } }]);
    });

    it('adds an offset in days when called with a numeric operand', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.today(5)}}',
        'result',
        TZ
      );
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

    it('supports a field reference as the offset operand', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.today({{data.offset}})}}',
        'result',
        TZ
      );
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
    it('emits the dependency stage before the consuming stage', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.add({{calc.mul(2; 3)}}; 1)}}',
        'result',
        TZ
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

    it('numbers dependency aux paths by operator position for double operators', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.sub({{calc.add(1; 2)}}; {{calc.add(3; 4)}})}}',
        'result',
        TZ
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

    it('handles deeply nested dependencies without re-prefixing aux paths', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.add({{calc.mul({{calc.sub(10; 1)}}; 2)}}; 1)}}',
        'result',
        TZ
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

    it('emits an aux dependency for a nested today() offset', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.today({{calc.add(1; 2)}})}}',
        'result',
        TZ
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

  describe('field naming', () => {
    it('writes the result under data.<name>', () => {
      const pipeline = buildCalculatedFieldPipeline(
        '{{calc.add(1; 2)}}',
        'myField',
        TZ
      );
      expect(Object.keys((pipeline[0] as any).$addFields)).toContain(
        'data.myField'
      );
    });
  });
});
