import { defaultRecordFieldsFlat } from '../../../../const/defaultRecordFields';

export default (sortField) => {
  console.log('defaultRecordFieldsFlat');
  console.log(defaultRecordFieldsFlat);
  const topFields = defaultRecordFieldsFlat.filter(x => x !== 'canEdit' && x !== 'lastUpdatedBy');
  // const topFields = defaultRecordFieldsFlat.filter(x => x !== 'canEdit' && x !== 'lastUpdatedBy');
  // topFields[topFields.findIndex(x => x == 'createdBy')] = 'createdBy.username';
  // console.log(a);
  console.log('topFields');
  console.log(topFields);
  console.log('sortField 1');
  console.log(sortField);
  console.log(topFields.includes(sortField));
  if (sortField && !topFields.includes(sortField)) {
    console.log('IN-----');
    return `data.${sortField}`;
  }
  console.log('sortField 2');
  console.log(sortField);
  return sortField ? sortField : 'createdAt';
};
