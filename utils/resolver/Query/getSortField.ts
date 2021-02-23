export default (sortField) => {
    const topFields = ['id', 'createdAt', 'modifiedAt'];
    if (sortField && !topFields.includes(sortField)) {
        return `data.${sortField}`;
    }
    return sortField;
}