/**
 * Filters out the fields not linked to a specified resource
 *
 * @param fields definition of structure fields
 * @param id resource id
 * @returns array of fields linked to the resource
 */
export default (fields, id): any[] => {
  return fields.filter(
    (x) => x.resource && x.resource === id.toString() && x.relatedName
  );
};
