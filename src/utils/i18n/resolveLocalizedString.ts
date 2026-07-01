/** Default locale to fall back on when no localized value matches. */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DEFAULT_FALLBACK_LOCALE = 'en';

/**
 * A value that can either be a plain string or a map of locale code to string
 * (e.g. SurveyJS localizable strings: `{ default: '...', fr: '...', en: '...' }`).
 */
export type LocalizedString = string | { [locale: string]: string } | null;

/**
 * Mapping of i18n/Angular language codes (ISO 639-1) to their SurveyJS locale
 * equivalents, for the codes where the two libraries disagree. SurveyJS uses a
 * few non-standard codes (checked against survey-core's locale list):
 * - Ukrainian: 'uk' (Angular) vs 'ua' (SurveyJS)
 * - Greek: 'el' vs 'gr'
 * - Serbian: 'sr' vs 'rs'
 * - Telugu: 'te' vs 'tel'
 */
const I18N_TO_SURVEY_LOCALE: Record<string, string> = {
  uk: 'ua',
  el: 'gr',
  sr: 'rs',
  te: 'tel',
};

/** Reverse of {@link I18N_TO_SURVEY_LOCALE}: SurveyJS locale to i18n/Angular code. */
const SURVEY_TO_I18N_LOCALE: Record<string, string> = Object.keys(
  I18N_TO_SURVEY_LOCALE
).reduce((acc, i18n) => {
  acc[I18N_TO_SURVEY_LOCALE[i18n]] = i18n;
  return acc;
}, {} as Record<string, string>);

/**
 * Convert an i18n/Angular language code to the matching SurveyJS locale code.
 *
 * @param lang The i18n/Angular language code
 * @returns The equivalent SurveyJS locale code (unchanged when there is no mismatch)
 */
export const toSurveyLocale = (lang: string): string =>
  I18N_TO_SURVEY_LOCALE[lang] ?? lang;

/**
 * Convert a SurveyJS locale code to the matching i18n/Angular language code.
 *
 * @param locale The SurveyJS locale code
 * @returns The equivalent i18n/Angular code (unchanged when there is no mismatch)
 */
export const toI18nLocale = (locale: string): string =>
  SURVEY_TO_I18N_LOCALE[locale] ?? locale;

/**
 * Candidate locale codes to try when resolving localized content, accounting
 * for the cases where i18n/Angular and SurveyJS disagree on the code (e.g.
 * Angular 'uk' vs SurveyJS 'ua'). Returns the given code first, then its
 * cross-library alias, de-duplicated and ignoring empty values.
 *
 * @param locale The active locale code, in either convention
 * @returns Ordered, de-duplicated list of codes to look up
 */
export const localeAliases = (locale: string | null | undefined): string[] => {
  if (!locale) return [];
  const candidates = [locale, toSurveyLocale(locale), toI18nLocale(locale)];
  return candidates.filter((code, i) => code && candidates.indexOf(code) === i);
};

/**
 * Resolves a localizable value to a plain string for the given locale.
 * Tries the active locale (under both i18n and SurveyJS naming conventions)
 * first, then falls back to the `default` key, the fallback locale, and finally
 * the first non-empty value available.
 *
 * @param value Value to resolve, either a string or a locale map.
 * @param locale Locale to translate to, when available.
 * @param fallbackLocale Locale to use when no value matches the active locale.
 * @returns The resolved string, or an empty string when nothing is available.
 */
export function resolveLocalizedString(
  value: LocalizedString | undefined,
  locale: string | null | undefined,
  fallbackLocale: string = DEFAULT_FALLBACK_LOCALE
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const active = locale || fallbackLocale;
  // Try the active locale under both naming conventions before falling back.
  for (const code of localeAliases(active)) {
    if (value[code] != null) return value[code];
  }
  return (
    value.default ??
    value[fallbackLocale] ??
    Object.values(value).find((v): v is string => !!v) ??
    ''
  );
}
