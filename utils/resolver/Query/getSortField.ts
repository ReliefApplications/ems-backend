export default (sortField) => {
    const topFields = ['id', 'createdAt'];
    if (sortField && !topFields.includes(sortField)) {
        return `data.${sortField}`;
    }
    return sortField;
}