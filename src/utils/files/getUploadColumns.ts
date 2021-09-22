export const getUploadColumns = (fields: any[], headers: any[]): any[] => {
    console.log(headers);
    const columns = [];
    const uselessFields = [];
    const usedHeaders = [];
    for (const field of fields) {
        switch (field.type) {
            case 'checkbox': {
                for (const item of field.choices) {
                    const name = `${field.name}.${item.value}`;
                    const index = headers.indexOf(name);
                    if (index > 0) {
                        columns.push({
                            name,
                            index,
                            field: field.name,
                            value: item.value,
                            type: field.type
                        });
                        usedHeaders.push(name);
                    } else {
                        uselessFields.push(name);
                    }
                }
                break;
            }
            case 'multipletext': {
                for (const item of field.items) {
                    const name = `${field.name}.${item.name}`;
                    const index = headers.indexOf(name);
                    if (index > 0) {
                        columns.push({
                            name,
                            index
                        });
                        usedHeaders.push(name);
                    } else {
                        uselessFields.push(name);
                    }
                }
                break;
            }
            case 'matrix': {
                for (const row of field.rows) {
                    const name = `${field.name}.${row.name}`;
                    const index = headers.indexOf(name);
                    if (index > 0) {
                        columns.push({
                            name,
                            index,
                            field: field.name,
                            row: row.name,
                            type: field.type
                        });
                        usedHeaders.push(name);
                    } else {
                        uselessFields.push(name);
                    }
                }
                break;
            }
            case 'matrixdropdown': {
                for (const row of field.rows) {
                    for (const column of field.columns) {
                        const name = `${field.name}.${row.name}.${column.name}`;
                        const index = headers.indexOf(name);
                        if (index > 0) {
                            columns.push({
                                name,
                                index,
                                field: field.name,
                                row: row.name,
                                column: column.name,
                                type: field.type
                            });
                            usedHeaders.push(name);
                        } else {
                            uselessFields.push(name);
                        }
                    }
                }
                break;
            }
            case 'matrixdynamic': {
                for (const column of field.columns) {
                    const name = `${field.name}.0.${column.name}`;
                    const index = headers.indexOf(name);
                    if (index > 0) {
                        columns.push({
                            name,
                            index
                        });
                        usedHeaders.push(name);
                    } else {
                        uselessFields.push(name);
                    }
                }
                break;
            }
            default: {
                const name = `${field.name}`;
                const index = headers.indexOf(name);
                if (index > 0) {
                    columns.push({
                        name,
                        index,
                        field: field.name,
                        type: field.type
                    });
                    usedHeaders.push(name);
                } else {
                    uselessFields.push(name);
                }
                break;
            }
        }
    }
    console.log('I do use fields ', columns.map(x => x.name));
    console.log('I do not use fields ', uselessFields);
    console.log('I do not use headers ', headers.filter(x => !usedHeaders.includes(x)));
    return columns;
}
