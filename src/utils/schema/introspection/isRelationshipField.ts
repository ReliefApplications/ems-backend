export const isRelationshipField = (fieldName) =>
  fieldName.endsWith('_id') ||
  fieldName.endsWith('_ids') ||
  fieldName.endsWith('_ref');
