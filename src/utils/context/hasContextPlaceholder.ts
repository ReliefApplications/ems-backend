/** Matches the same {{context.field}} placeholder shape used by the frontend ContextService */
const CONTEXT_PLACEHOLDER_REGEX = /{{context\.(.*?)}}/;

/**
 * Checks whether a dashboard name (or any of its translations) contains
 * a {{context.field}} placeholder, meaning it should be treated as a
 * live title template instead of being overwritten with the raw display field value.
 *
 * @param name Dashboard name
 * @param nameTranslations Dashboard name translations
 * @returns true if a context placeholder is present
 */
export const hasContextPlaceholder = (
  name?: string,
  nameTranslations?: Record<string, string>
): boolean => {
  if (name && CONTEXT_PLACEHOLDER_REGEX.test(name)) {
    return true;
  }
  if (nameTranslations) {
    return Object.values(nameTranslations).some(
      (value) =>
        typeof value === 'string' && CONTEXT_PLACEHOLDER_REGEX.test(value)
    );
  }
  return false;
};
