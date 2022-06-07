import { FLAT_DEFAULT_FIELDS } from './getFilter';

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

export default (sortField: string): string => {
  const defaultSortField = defaultSortFields.find((x) => x.name === sortField);
  if (sortField && !defaultSortField) {
    if (sortField.includes('.')) {
      const [field, subField] = sortField.split('.');
      if (FLAT_DEFAULT_FIELDS.includes(subField)) {
        return `_${field}.${subField}`;
      } else {
        return `_${field}.data.${subField}`;
      }
    }
    return `data.${sortField}`;
  }
  return defaultSortField ? defaultSortField.path : 'createdAt';
};
