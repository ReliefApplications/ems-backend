export default (fields, id): string[] => {
    return fields.filter(x => x.resource && x.resource === id.toString()).map(x => x.name);
}