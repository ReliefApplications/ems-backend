import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import { getExpressionFromString } from '@utils/aggregation/expressionFromString';

describe('buildCalculatedFieldPipeline', () => {
  it('parses direct user placeholders', () => {
    expect(getExpressionFromString('{{user.country}}')).toEqual({
      type: 'user',
      value: 'country',
    });
  });

  it('builds a direct calculated field from a user attribute', () => {
    expect(
      buildCalculatedFieldPipeline('{{user.country}}', 'userCountry', 'UTC', {
        country: 'France',
      })
    ).toEqual([
      {
        $addFields: {
          'data.userCountry': 'France',
        },
      },
    ]);
  });

  it('falls back to an empty string for missing user attributes', () => {
    expect(
      buildCalculatedFieldPipeline(
        '{{calc.concat( {{user.country}} ; "-" ; {{data.region}} )}}',
        'label',
        'UTC',
        {}
      )
    ).toEqual([
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
                $cond: {
                  if: { $eq: [{ $type: '$data.region' }, 'date'] },
                  then: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$data.region',
                    },
                  },
                  else: {
                    $convert: {
                      input: '$data.region',
                      to: 'string',
                      onError: '',
                      onNull: '',
                    },
                  },
                },
              },
            ],
          },
        },
      },
    ]);
  });
});
