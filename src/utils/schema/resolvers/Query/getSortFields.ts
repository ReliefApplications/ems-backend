import { FLAT_DEFAULT_FIELDS } from './getFilter';

/** Array of name/document paths of fields */
const defaultSortFields: { name: string; path: string }[] = [
  { name: 'id', path: 'id' },
  { name: 'incrementalId', path: 'incrementalId' },
  { name: 'createdAt', path: 'createdAt' },
  { name: 'modifiedAt', path: 'modifiedAt' },
  { name: 'form', path: '_form.name' },
  { name: 'lastUpdateForm', path: '_lastUpdateForm.name' },
  { name: 'createdBy.id', path: '_createdBy.user._id' },
  { name: 'createdBy.name', path: '_createdBy.user.name' },
  { name: 'createdBy.username', path: '_createdBy.user.username' },
  { name: 'lastUpdatedBy.id', path: '_lastUpdatedBy.user._id' },
  { name: 'lastUpdatedBy.name', path: '_lastUpdatedBy.user.name' },
  { name: 'lastUpdatedBy.username', path: '_lastUpdatedBy.user.username' },
];

/**
 * Decodes the sort order string
 *
 * @param sortOrder The sort order string
 * @returns The decoded sorted order
 */
const getOrder = (sortOrder: string): number => (sortOrder === 'asc' ? 1 : -1);

/**
 * Gets nested sorting path for a record
 *
 * @param sortFields List with all fields used to the nested sorting
 * @param sortFields.field The field name from query parameters
 * @param sortFields.order The order to sort field
 * @param field The field object
 * @returns object with all the fields and its sorting order
 */
export default (
  sortFields: { field: string; order: 'asc' | 'desc' }[],
  field?: any
): any => {
  let res = {};
  sortFields.forEach((item: any) => {
    const sortField = item.field;
    const order = getOrder(item.order);
    const defaultSortField = defaultSortFields.find(
      (x) => x.name === sortField
    );
    // If it's not a default field
    if (sortField && !defaultSortField) {
      // If it's a resource field
      if (sortField.includes('.') && (!field || !field.referenceData?.id)) {
        const [parentField, subField] = sortField.split('.');
        if (FLAT_DEFAULT_FIELDS.includes(subField)) {
          res = {
            ...res,
            ...{ [`_${parentField}.${subField}`]: order },
          };
          return;
        } else {
          res = {
            ...res,
            ...{ [`_${parentField}.data.${subField}`]: order },
          };
          return;
        }
      }
      if (field && (field.choices || field.choicesByUrl)) {
        res = {
          ...res,
          ...{ [`_${sortField}`]: order },
        };
        return;
      }
      res = {
        ...res,
        ...{ [`data.${sortField}`]: order },
      };
      return;
    }
    res = {
      ...res,
      ...{ [defaultSortField ? defaultSortField.path : 'createdAt']: order },
    };
    return;
  });
  return res;
};
