/**
 * Checks if field indicates a relationship with another document
 *
 * @param fieldName The field name
 * @returns If the field indicates a relationship with another document
 */
export const isRelationshipField = (fieldName) =>
  fieldName.endsWith('_id') ||
  fieldName.endsWith('_ids') ||
  fieldName.endsWith('_ref');
