export const isNotRelationshipField = (fieldName) =>
  !fieldName.endsWith('_id') && !fieldName.endsWith('_ids');
