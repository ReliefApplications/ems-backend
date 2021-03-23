import { defaultFields } from "../../../const/defaultRecordFields";

export default (sortField) => {
    const topFields = defaultFields.filter(x => x !== 'createdBy' && x !== 'canEdit');
    if (sortField && !topFields.includes(sortField)) {
        return `data.${sortField}`;
    }
    return 'createdAt';
}