import {
  DEFAULT_FALLBACK_LOCALE,
  localeAliases,
  resolveLocalizedString,
  toI18nLocale,
  toSurveyLocale,
} from '@utils/i18n/resolveLocalizedString';

describe('toSurveyLocale', () => {
  it('maps i18n codes to their SurveyJS equivalents', () => {
    expect(toSurveyLocale('uk')).toBe('ua');
    expect(toSurveyLocale('el')).toBe('gr');
    expect(toSurveyLocale('sr')).toBe('rs');
    expect(toSurveyLocale('te')).toBe('tel');
  });

  it('returns the code unchanged when there is no mismatch', () => {
    expect(toSurveyLocale('fr')).toBe('fr');
    expect(toSurveyLocale('en')).toBe('en');
  });
});

describe('toI18nLocale', () => {
  it('maps SurveyJS codes back to their i18n equivalents', () => {
    expect(toI18nLocale('ua')).toBe('uk');
    expect(toI18nLocale('gr')).toBe('el');
    expect(toI18nLocale('rs')).toBe('sr');
    expect(toI18nLocale('tel')).toBe('te');
  });

  it('returns the code unchanged when there is no mismatch', () => {
    expect(toI18nLocale('fr')).toBe('fr');
    expect(toI18nLocale('en')).toBe('en');
  });
});

describe('localeAliases', () => {
  it('returns the i18n code followed by its SurveyJS alias', () => {
    expect(localeAliases('uk')).toEqual(['uk', 'ua']);
    expect(localeAliases('el')).toEqual(['el', 'gr']);
    expect(localeAliases('sr')).toEqual(['sr', 'rs']);
    expect(localeAliases('te')).toEqual(['te', 'tel']);
  });

  it('returns the SurveyJS code followed by its i18n alias', () => {
    expect(localeAliases('ua')).toEqual(['ua', 'uk']);
    expect(localeAliases('gr')).toEqual(['gr', 'el']);
  });

  it('de-duplicates when both conventions agree', () => {
    expect(localeAliases('fr')).toEqual(['fr']);
    expect(localeAliases('en')).toEqual(['en']);
  });

  it('returns an empty array for empty values', () => {
    expect(localeAliases(null)).toEqual([]);
    expect(localeAliases(undefined)).toEqual([]);
    expect(localeAliases('')).toEqual([]);
  });
});

describe('resolveLocalizedString', () => {
  it('returns an empty string for nullish values', () => {
    expect(resolveLocalizedString(null, 'fr')).toBe('');
    expect(resolveLocalizedString(undefined, 'fr')).toBe('');
  });

  it('passes through plain string values', () => {
    expect(resolveLocalizedString('hello', 'fr')).toBe('hello');
  });

  it('resolves the value for the active locale', () => {
    const value = { default: 'New', fr: 'Nouveau' };
    expect(resolveLocalizedString(value, 'fr')).toBe('Nouveau');
  });

  it('resolves the SurveyJS alias when the i18n locale is requested', () => {
    // Angular sends 'uk' but the localized map uses the SurveyJS 'ua' key.
    const value = { default: 'New request received', ua: 'Нова заявка отримана' };
    expect(resolveLocalizedString(value, 'uk')).toBe('Нова заявка отримана');
  });

  it('resolves the i18n alias when the SurveyJS locale is requested', () => {
    const value = { default: 'New', uk: 'Нова' };
    expect(resolveLocalizedString(value, 'ua')).toBe('Нова');
  });

  it('falls back to default when the locale is missing', () => {
    const value = { default: 'New', fr: 'Nouveau' };
    expect(resolveLocalizedString(value, 'de')).toBe('New');
  });

  it('falls back to the fallback locale when there is no default', () => {
    const value = { en: 'New', fr: 'Nouveau' };
    expect(resolveLocalizedString(value, 'de')).toBe('New');
  });

  it('falls back to the first non-empty value as a last resort', () => {
    const value = { it: 'Nuovo' };
    expect(resolveLocalizedString(value, 'de')).toBe('Nuovo');
  });

  it('returns an empty string when the map is empty', () => {
    expect(resolveLocalizedString({}, 'fr')).toBe('');
  });

  it('uses the default fallback locale when no locale is provided', () => {
    const value = { default: 'New', en: 'New (en)' };
    expect(resolveLocalizedString(value, undefined)).toBe(
      value[DEFAULT_FALLBACK_LOCALE]
    );
  });

  it('honours a custom fallback locale', () => {
    const value = { fr: 'Nouveau', de: 'Neu' };
    expect(resolveLocalizedString(value, 'es', 'de')).toBe('Neu');
  });
});
