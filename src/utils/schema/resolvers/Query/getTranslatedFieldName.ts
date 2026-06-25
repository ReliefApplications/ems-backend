/**
 * Get the field name to use for a given locale.
 *
 * A source field can have sibling "translation" fields, each tied to a target
 * locale through the `translateField` (name of the source field) and
 * `translateTo` (target locale) properties. When a sibling matching the user's
 * locale exists, queries, sorts, filters and aggregations should transparently
 * read from that sibling instead of the source field.
 *
 * @param fieldName Source field name.
 * @param fields Structure fields, possibly containing translation siblings.
 * @param locale User locale (e.g. 'en', 'es').
 * @returns The sibling field name when a translation exists for the locale, otherwise the original field name.
 */
const getTranslatedFieldName = (
  fieldName: string,
  fields: any[],
  locale?: string
): string => {
  if (!locale || !fields) {
    return fieldName;
  }
  const siblingField = fields.find(
    (f: any) =>
      f &&
      f.translateField === fieldName &&
      f.translateTo &&
      f.translateTo.toLowerCase() === locale.toLowerCase()
  );
  return siblingField ? siblingField.name : fieldName;
};

export default getTranslatedFieldName;
