import getSortAggregation from '@utils/schema/resolvers/Query/getSortAggregation';
import { getFullChoices } from '@utils/form';

jest.mock('@utils/form', () => ({
  getFullChoices: jest.fn(),
}));

const mockedGetFullChoices = getFullChoices as jest.Mock;

/** Choice list with a `ua` translation for each label. */
const CHOICES = [
  { value: 'New', text: { default: 'New', ua: 'Нова' } },
  { value: 'Closed', text: { default: 'Closed', ua: 'Завершено' } },
];

describe('getSortAggregation - localized choice sort', () => {
  afterEach(() => jest.clearAllMocks());

  it('sorts single-select fields on the localized text', async () => {
    mockedGetFullChoices.mockResolvedValue(CHOICES);
    const fields = [{ name: 'status', type: 'dropdown', choices: CHOICES }];

    const aggregation = await getSortAggregation(
      [{ field: 'status', order: 'asc' }],
      fields,
      { locale: 'uk' }
    );

    const addFields = aggregation.find((s) => s.$addFields);
    // The choices text array injected into the pipeline must be translated.
    expect(addFields.$addFields._status.$let.vars.choicesText).toEqual([
      'Нова',
      'Завершено',
    ]);
    // Sort step targets the computed translated field.
    expect(aggregation[aggregation.length - 1]).toEqual({
      $sort: { _status: 1 },
    });
  });

  it('injects localized texts for multi-select fields', async () => {
    mockedGetFullChoices.mockResolvedValue(CHOICES);
    const fields = [{ name: 'status', type: 'tagbox', choices: CHOICES }];

    const aggregation = await getSortAggregation(
      [{ field: 'status', order: 'desc' }],
      fields,
      { locale: 'uk' }
    );

    const addFields = aggregation.find((s) => s.$addFields);
    const injectedChoices = addFields.$addFields._status.$let.vars.choices;
    expect(injectedChoices.map((c: any) => c.text)).toEqual([
      'Нова',
      'Завершено',
    ]);
  });

  it('falls back to the default text when the locale is missing', async () => {
    mockedGetFullChoices.mockResolvedValue(CHOICES);
    const fields = [{ name: 'status', type: 'dropdown', choices: CHOICES }];

    const aggregation = await getSortAggregation(
      [{ field: 'status', order: 'asc' }],
      fields,
      { locale: 'fr' }
    );

    const addFields = aggregation.find((s) => s.$addFields);
    expect(addFields.$addFields._status.$let.vars.choicesText).toEqual([
      'New',
      'Closed',
    ]);
  });
});

describe('getSortAggregation - compound sort', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns an empty aggregation when no descriptors are given', async () => {
    const aggregation = await getSortAggregation([], [], {});
    expect(aggregation).toEqual([]);
  });

  it('sorts by several plain fields, preserving priority order', async () => {
    const fields = [
      { name: 'priority_flag', type: 'text' },
      { name: 'lastname', type: 'text' },
    ];

    const aggregation = await getSortAggregation(
      [
        { field: 'priority_flag', order: 'asc' },
        { field: 'lastname', order: 'desc' },
      ],
      fields,
      {}
    );

    expect(aggregation).toEqual([
      {
        $sort: {
          'data.priority_flag': 1,
          'data.lastname': -1,
        },
      },
    ]);
  });

  it('combines a choice field and a plain field without collisions', async () => {
    mockedGetFullChoices.mockResolvedValue(CHOICES);
    const fields = [
      { name: 'status', type: 'dropdown', choices: CHOICES },
      { name: 'lastname', type: 'text' },
    ];

    const aggregation = await getSortAggregation(
      [
        { field: 'status', order: 'asc' },
        { field: 'lastname', order: 'asc' },
      ],
      fields,
      {}
    );

    // Only the choice field should produce an $addFields stage.
    const addFieldsStages = aggregation.filter((s) => s.$addFields);
    expect(addFieldsStages).toHaveLength(1);
    expect(addFieldsStages[0].$addFields._status).toBeDefined();

    // The trailing $sort stage should reference both resolved paths, in order.
    expect(aggregation[aggregation.length - 1]).toEqual({
      $sort: { _status: 1, 'data.lastname': 1 },
    });
  });

  it('handles two choice fields without key collisions', async () => {
    mockedGetFullChoices.mockResolvedValue(CHOICES);
    const fields = [
      { name: 'status', type: 'dropdown', choices: CHOICES },
      { name: 'severity', type: 'dropdown', choices: CHOICES },
    ];

    const aggregation = await getSortAggregation(
      [
        { field: 'status', order: 'asc' },
        { field: 'severity', order: 'desc' },
      ],
      fields,
      {}
    );

    const addFieldsStages = aggregation.filter((s) => s.$addFields);
    expect(addFieldsStages).toHaveLength(2);
    expect(addFieldsStages[0].$addFields._status).toBeDefined();
    expect(addFieldsStages[1].$addFields._severity).toBeDefined();

    expect(aggregation[aggregation.length - 1]).toEqual({
      $sort: { _status: 1, _severity: -1 },
    });
  });
});
