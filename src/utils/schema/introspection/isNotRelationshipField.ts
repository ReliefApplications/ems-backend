/**
 * Checks if field doesn't indicate a relationship with another document
 *
 * @param fieldName The field name
 * @returns If the field doesn't indicate a relationship with another document
 */
export const isNotRelationshipField = (fieldName) =>
  !fieldName.endsWith('_id') && !fieldName.endsWith('_ids');
