/**
 * Transforms fields into export columns.
 * @param fields definition of structure fields.
 * @returns list of export columns.
 */
export const getColumns = (fields: any[]): any[] => {
    const columns = [];
    for (const field of fields) {
        switch (field.type) {
            case 'multipletext': {
                for (const item of field.items) {
                    columns.push({
                        name: `${field.name}.${item.name}`
                    });
                }
                break;
            }
            case 'matrix': {
                for (const row of field.rows) {
                    columns.push({
                        name: `${field.name}.${row.name}`
                    });
                }
                break;
            }
            case 'matrixdropdown': {
                for (const row of field.rows) {
                    for (const column of field.columns) {
                        columns.push({
                            name: `${field.name}.${row.name}.${column.name}`
                        });
                    }
                }
                break;
            }
            case 'matrixdynamic': {
                for (const column of field.columns) {
                    columns.push({
                        name: `${field.name}.0.${column.name}`
                    });
                }
                break;
            }
            default: {
                columns.push({
                    name: `${field.name}`
                });
                break;
            }
        }
    }
    return columns;
}
