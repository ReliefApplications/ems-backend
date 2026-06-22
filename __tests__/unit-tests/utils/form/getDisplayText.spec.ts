import {
  getFullChoices,
  getLocalizedText,
  getText,
} from '@utils/form/getDisplayText';

describe('getDisplayText utilities', () => {
  const choices = [
    {
      value: 'open',
      text: {
        default: 'Open',
        en: 'Open',
        fr: 'Ouvert',
        uk: 'Відкрито',
      },
    },
    {
      value: 'closed',
      text: {
        default: 'Closed',
        en: 'Closed',
      },
    },
  ];

  it('returns the choice label for the requested language', () => {
    expect(getText(choices, 'open', 'fr')).toBe('Ouvert');
  });

  it('returns the choice label for Ukrainian', () => {
    expect(getText(choices, 'open', 'uk')).toBe('Відкрито');
  });

  it('falls back to default labels when the requested language is missing', () => {
    expect(getText(choices, 'closed', 'fr')).toBe('Closed');
  });

  it('supports locale variants through their base language', () => {
    expect(getLocalizedText(choices[0].text, 'fr_CA', 'open')).toBe('Ouvert');
  });

  it('supports Ukrainian locale variants through their base language', () => {
    expect(getLocalizedText(choices[0].text, 'uk_UA', 'open')).toBe('Відкрито');
  });

  it('can preserve dynamic choice text behavior without locale localization', () => {
    expect(getText(choices, 'open', 'uk', false)).toBe('Open');
  });

  it('keeps the stored value when no matching choice exists', () => {
    expect(getText(choices, 'unknown', 'fr')).toBe('unknown');
  });

  it('localizes static choices returned by getFullChoices', async () => {
    await expect(
      getFullChoices({ choices }, { locale: 'fr' } as any)
    ).resolves.toEqual([
      { value: 'open', text: 'Ouvert' },
      { value: 'closed', text: 'Closed' },
    ]);
  });
});
