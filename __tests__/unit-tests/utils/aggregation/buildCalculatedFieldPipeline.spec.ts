import { ReferenceData } from '@models';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import * as displayTextUtils from '@utils/form/getDisplayText';
import { getExpressionFromString } from '@utils/aggregation/expressionFromString';

describe('buildCalculatedFieldPipeline', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should parse field text modifiers as dedicated field operators', () => {
    const expression = getExpressionFromString(
      '{{calc.eq({{data.country:text}}; "France")}}'
    );

    expect(expression).toMatchObject({
      operation: 'eq',
      operator1: {
        type: 'field',
        value: {
          field: 'country',
          display: 'text',
        },
      },
      operator2: {
        type: 'const',
        value: 'France',
      },
    });
  });

  it('should preserve array shape when resolving multiselect display text', async () => {
    const pipeline = await buildCalculatedFieldPipeline(
      '{{calc.includes({{data.tags:text}}; "Alpha")}}',
      'hasAlpha',
      'UTC',
      {
        fields: [
          {
            name: 'tags',
            type: 'tagbox',
            choices: [
              { value: 'alpha', text: 'Alpha' },
              { value: 'beta', text: 'Beta' },
            ],
          },
        ],
      }
    );

    expect(pipeline[0]).toEqual({
      $addFields: {
        'aux.displayText.tags': {
          $cond: {
            if: { $isArray: '$data.tags' },
            then: {
              $map: {
                input: '$data.tags',
                as: 'selectedValue',
                in: {
                  $let: {
                    vars: {
                      choiceValues: ['alpha', 'beta'],
                      choiceTexts: ['Alpha', 'Beta'],
                      normalizedSelectedValue: {
                        $ifNull: ['$$selectedValue.value', '$$selectedValue'],
                      },
                    },
                    in: {
                      $let: {
                        vars: {
                          choiceIndex: {
                            $indexOfArray: [
                              '$$choiceValues',
                              '$$normalizedSelectedValue',
                            ],
                          },
                        },
                        in: {
                          $cond: {
                            if: { $eq: ['$$choiceIndex', -1] },
                            then: '$$normalizedSelectedValue',
                            else: {
                              $arrayElemAt: ['$$choiceTexts', '$$choiceIndex'],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            else: {
              $ifNull: ['$data.tags.value', '$data.tags'],
            },
          },
        },
      },
    });
    expect(pipeline[1]).toEqual({
      $addFields: {
        'data.hasAlpha': {
          $cond: {
            if: { $isArray: '$aux.displayText.tags' },
            then: {
              $in: ['Alpha', '$aux.displayText.tags'],
            },
            else: false,
          },
        },
      },
    });
  });

  it('should support static strings and info values in concat expressions', async () => {
    const pipeline = await buildCalculatedFieldPipeline(
      '{{calc.concat({{data.country:text}}; " - "; {{info.incrementalId}})}}',
      'label',
      'UTC',
      {
        fields: [
          {
            name: 'country',
            type: 'dropdown',
            choices: [{ value: 'fr', text: 'France' }],
          },
        ],
      }
    );

    const concatStep = pipeline[1].$addFields['data.label'];

    expect(concatStep.$concat[0]).toHaveProperty('$cond');
    expect(concatStep.$concat[1]).toEqual({
      $convert: {
        input: ' - ',
        to: 'string',
        onError: '',
        onNull: '',
      },
    });
    expect(concatStep.$concat[2]).toHaveProperty('$cond');
  });

  it('should normalize wrapped reference-data values before matching labels', async () => {
    jest.spyOn(displayTextUtils, 'getFullChoices').mockResolvedValue([
      { value: 'fr', text: 'France' },
      { value: 'de', text: 'Germany' },
    ]);
    jest.spyOn(ReferenceData, 'findById').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          valueField: 'id',
        }),
      }),
    } as any);

    const pipeline = await buildCalculatedFieldPipeline(
      '{{calc.eq({{data.country:text}}; "France")}}',
      'matches',
      'UTC',
      {
        fields: [
          {
            name: 'country',
            type: 'dropdown',
            referenceData: {
              id: '67f6f3e2b5b8d2c2f3d1a123',
            },
          },
        ],
      }
    );

    expect(
      pipeline[0].$addFields['aux.displayText.country'].$let.vars
        .normalizedValue
    ).toEqual({
      $ifNull: [
        '$data.country.value.id',
        {
          $ifNull: [
            '$data.country.id',
            {
              $ifNull: ['$data.country.value', '$data.country'],
            },
          ],
        },
      ],
    });
  });

  it('should support direct field-text expressions without a calc wrapper', async () => {
    const pipeline = await buildCalculatedFieldPipeline(
      '{{data.status:text}}',
      'status_check',
      'UTC',
      {
        fields: [
          {
            name: 'status',
            type: 'dropdown',
            choices: [
              { value: 'open', text: 'Open' },
              { value: 'closed', text: 'Closed' },
            ],
          },
        ],
      }
    );

    expect(pipeline).toEqual([
      {
        $addFields: {
          'aux.displayText.status': {
            $let: {
              vars: {
                choiceValues: ['open', 'closed'],
                choiceTexts: ['Open', 'Closed'],
                normalizedValue: {
                  $ifNull: ['$data.status.value', '$data.status'],
                },
              },
              in: {
                $let: {
                  vars: {
                    choiceIndex: {
                      $indexOfArray: ['$$choiceValues', '$$normalizedValue'],
                    },
                  },
                  in: {
                    $cond: {
                      if: { $eq: ['$$choiceIndex', -1] },
                      then: '$$normalizedValue',
                      else: {
                        $arrayElemAt: ['$$choiceTexts', '$$choiceIndex'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          'data.status_check': '$aux.displayText.status',
        },
      },
    ]);
  });
});
