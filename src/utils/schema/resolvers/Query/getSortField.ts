const defaultSortFields: { name: string; path: string }[] = [
  { name: 'id', path: 'id' },
  { name: 'incrementalId', path: 'incrementalId' },
  { name: 'modifiedAt', path: 'modifiedAt' },
  { name: 'createdBy.id', path: 'createdBy.user._id' },
  { name: 'createdBy.name', path: 'createdBy.user.name' },
  { name: 'createdBy.username', path: 'createdBy.user.username' },
];

export default (sortField) => {
  const defaultSortField = defaultSortFields.find((x) => x.name === sortField);
  if (sortField && !defaultSortField) {
    return `data.${sortField}`;
  }
  return defaultSortField ? defaultSortField.path : 'createdAt';
};
