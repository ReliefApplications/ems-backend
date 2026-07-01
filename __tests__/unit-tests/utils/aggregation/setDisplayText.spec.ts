import setDisplayText from '@utils/aggregation/setDisplayText';
import { getFullChoices } from '@utils/form/getDisplayText';

// Keep the real getText (pure) but stub the choice-fetching, which would
// otherwise hit data sources.
jest.mock('@utils/form/getDisplayText', () => {
  const actual = jest.requireActual('@utils/form/getDisplayText');
  return { ...actual, getFullChoices: jest.fn() };
});

const mockedGetFullChoices = getFullChoices as jest.Mock;

/** Choice list with a `ua` translation for each label. */
const CHOICES = [
  { value: 'New', text: { default: 'New', ua: 'Нова' } },
  { value: 'Closed', text: { default: 'Closed', ua: 'Завершено' } },
];

describe('setDisplayText - locale translation', () => {
  afterEach(() => jest.clearAllMocks());

  const resource: any = {
    fields: [{ name: 'status', type: 'dropdown', choices: CHOICES }],
  };
  const mappedFields = [{ key: 'status', value: 'status' }];

  it('replaces values with the localized display text', async () => {
    mockedGetFullChoices.mockResolvedValue(CHOICES);
    const items = [{ status: 'New' }, { status: 'Closed' }];

    await setDisplayText(mappedFields, items, resource, { locale: 'uk' });

    expect(items).toEqual([{ status: 'Нова' }, { status: 'Завершено' }]);
  });

  it('falls back to the default text when the locale is not translated', async () => {
    mockedGetFullChoices.mockResolvedValue(CHOICES);
    const items = [{ status: 'New' }];

    await setDisplayText(mappedFields, items, resource, { locale: 'fr' });

    expect(items).toEqual([{ status: 'New' }]);
  });
});
