import { getICULocale } from '@utils/date/getICULocale';

describe('getICULocale', () => {
  it('returns the language code when it is supported', () => {
    expect(getICULocale('fr')).toBe('fr');
    expect(getICULocale('uk')).toBe('uk');
    expect(getICULocale('zh_Hant')).toBe('zh_Hant');
  });

  it('falls back to english for unsupported codes', () => {
    expect(getICULocale('xx')).toBe('en');
    expect(getICULocale('fr-FR')).toBe('en');
  });

  it('falls back to english when no language is given', () => {
    expect(getICULocale(undefined)).toBe('en');
  });
});
