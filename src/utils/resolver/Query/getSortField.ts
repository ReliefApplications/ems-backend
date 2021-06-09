import { defaultRecordFieldsFlat } from '../../../const/defaultRecordFields';

export default (sortField) => {
    const topFields = defaultRecordFieldsFlat.filter(x => x !== 'createdBy' && x !== 'canEdit' && x !== 'lastUpdatedBy');
    if (sortField && !topFields.includes(sortField)) {
        return `data.${sortField}`;
    }
    return sortField ? sortField : 'createdAt';
}