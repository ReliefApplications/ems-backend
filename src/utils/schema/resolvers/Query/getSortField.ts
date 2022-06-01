/** Array of name/document paths of fields */
const defaultSortFields: { name: string; path: string }[] = [
  { name: 'id', path: 'id' },
  { name: 'incrementalId', path: 'incrementalId' },
  { name: 'createdAt', path: 'createdAt' },
  { name: 'modifiedAt', path: 'modifiedAt' },
  { name: 'form', path: 'form.name' },
  { name: 'createdBy.id', path: 'createdBy.user._id' },
  { name: 'createdBy.name', path: 'createdBy.user.name' },
  { name: 'createdBy.username', path: 'createdBy.user.username' },
  { name: 'lastUpdatedBy.id', path: 'lastUpdatedBy.user._id' },
  { name: 'lastUpdatedBy.name', path: 'lastUpdatedBy.user.name' },
  { name: 'lastUpdatedBy.username', path: 'lastUpdatedBy.user.username' },
];

/**
 * Gets the document path for a record
 *
 * @param sortField The field
 * @returns The path for the field
 */
export default (sortField) => {
  const defaultSortField = defaultSortFields.find((x) => x.name === sortField);
  if (sortField && !defaultSortField) {
    return `data.${sortField}`;
  }
  return defaultSortField ? defaultSortField.path : 'createdAt';
};
