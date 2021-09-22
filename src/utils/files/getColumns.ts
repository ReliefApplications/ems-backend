/**
 * Transforms fields into export columns.
 * @param fields definition of structure fields.
 * @returns list of export columns.
 */
export const getColumns = (fields: any[]): any[] => {
    const columns = [];
    for (const field of fields) {
        switch (field.type) {
            case 'checkbox': {
                for (const item of field.choices) {
                    const name = `${field.name}.${item.value}`;
                    columns.push({
                        name
                    });
                }
                break;
            }
            case 'tagbox': {
                for (const item of field.choices) {
                    const name = `${field.name}.${item.value}`;
                    columns.push({
                        name
                    });
                }
                break;
            }
            case 'multipletext': {
                for (const item of field.items) {
                    const name = `${field.name}.${item.name}`;
                    columns.push({
                        name
                    });
                }
                break;
            }
            case 'matrix': {
                for (const row of field.rows) {
                    const name = `${field.name}.${row.name}`;
                    columns.push({
                        name
                    });
                }
                break;
            }
            case 'matrixdropdown': {
                for (const row of field.rows) {
                    for (const column of field.columns) {
                        const name = `${field.name}.${row.name}.${column.name}`;
                        columns.push({
                            name
                        });
                    }
                }
                break;
            }
            case 'matrixdynamic': {
                for (const column of field.columns) {
                    const name = `${field.name}.0.${column.name}`;
                    columns.push({
                        name
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
