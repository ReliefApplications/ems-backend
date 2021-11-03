export default (fields, id): any[] => {
  return fields.filter(x => x.resource && x.resource === id.toString() && x.relatedName);
};
