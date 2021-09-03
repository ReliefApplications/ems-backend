interface Field {
    name: string;
    type: string;
    resource?: string;
}

/**
 * Get GraphQL name from field definition.
 * @param field field definition.
 * @returns GraphQL name.
 */
const getFieldName = (field: Field): string => {
    const name = field.name.trim().split('-').join('_');
    if (field.resource) {
        return field.type === 'resources' ? `${name}_ids` : `${name}_id`;
    }
    return name;
}

export default getFieldName;
