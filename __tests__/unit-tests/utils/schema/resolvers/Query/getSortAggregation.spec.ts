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

    const aggregation = await getSortAggregation('status', 'asc', fields, {
      locale: 'uk',
    });

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

    const aggregation = await getSortAggregation('status', 'desc', fields, {
      locale: 'uk',
    });

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

    const aggregation = await getSortAggregation('status', 'asc', fields, {
      locale: 'fr',
    });

    const addFields = aggregation.find((s) => s.$addFields);
    expect(addFields.$addFields._status.$let.vars.choicesText).toEqual([
      'New',
      'Closed',
    ]);
  });
});
