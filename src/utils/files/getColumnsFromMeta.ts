export const getColumnsFromMeta = (meta: any): any[] => {
  const columns = [];
  for (const key in meta) {
    const field = meta[key];
    columns.push({
      name: field.name,
      field: field.name,
      type: field.type,
      meta: {
        field,
      },
    });
    // if (field.type) {
      
    // } else {
    //   columns.concat(getColumnsFromMeta(field));
    // }
  }
  return columns;
};
