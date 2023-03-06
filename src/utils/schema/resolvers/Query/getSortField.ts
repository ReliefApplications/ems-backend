import { FLAT_DEFAULT_FIELDS } from './getFilter';

/** Array of name/document paths of fields */
const defaultSortFields: { name: string; path: string }[] = [
  { name: 'id', path: 'id' },
  { name: 'incrementalId', path: 'incrementalId' },
  { name: 'createdAt', path: 'createdAt' },
  { name: 'modifiedAt', path: 'modifiedAt' },
  { name: 'form', path: '_form.name' },
  { name: 'createdBy.id', path: '_createdBy.user._id' },
  { name: 'createdBy.name', path: '_createdBy.user.name' },
  { name: 'createdBy.username', path: '_createdBy.user.username' },
  { name: 'lastUpdatedBy.id', path: '_lastUpdatedBy.user._id' },
  { name: 'lastUpdatedBy.name', path: '_lastUpdatedBy.user.name' },
  { name: 'lastUpdatedBy.username', path: '_lastUpdatedBy.user.username' },
];

/**
 * Gets the document path for a record
 *
 * @param sortField The field name from query parameters
 * @param field The field object
 * @returns The path for the field
 */
export default (sortField: string, field?: any): string => {
  const defaultSortField = defaultSortFields.find((x) => x.name === sortField);
  // If it's not a default field
  if (sortField && !defaultSortField) {
    // If it's a resource field
    if (sortField.includes('.') && (!field || !field.referenceData?.id)) {
      const [parentField, subField] = sortField.split('.');
      if (FLAT_DEFAULT_FIELDS.includes(subField)) {
        return `_${parentField}.${subField}`;
      } else {
        return `_${parentField}.data.${subField}`;
      }
    }
    if (field && (field.choices || field.choicesByUrl)) {
      return `_${sortField}`;
    }
    return `data.${sortField}`;
  }
  return defaultSortField ? defaultSortField.path : 'createdAt';
};
