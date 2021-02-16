import { camelize, pluralize, singularize } from 'inflection';


export const getRelationshipFromKey = (key) => camelize(pluralize(key));


export const getTypeFromKey = (key) => camelize(singularize(key));

export const getMetaTypeFromKey = (key) => `_${camelize(singularize(key))}Meta`;

export const getRelatedKey = (fieldName) =>
    camelize(pluralize(fieldName.substr(0, fieldName.length - 3)));


export const getReverseRelatedField = (key) => `${singularize(key)}_id`;


export const getRelatedType = (fieldName, data, typesById) => {
    const relations: any = Object.fromEntries(
        data.map(x => [x.name, x.resource])
    );
    const id = relations[fieldName.substr(0, fieldName.length - 3)];

    return typesById[id];
}


export const getRelatedTypeName = (fieldName) =>
    getTypeFromKey(fieldName.substr(0, fieldName.length - 3));