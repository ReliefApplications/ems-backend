import { getMetaFields } from "../../introspection/getFields";
import getReversedFields from "../../introspection/getReversedFields";
import { getRelatedTypeName, getRelationshipFromKey } from "../../introspection/getTypeFromKey";
import { isRelationshipField } from "../../introspection/isRelationshipField";
import meta from "../Query/meta";

function Meta(entityName, data, id, ids) {

    const entityFields = Object.keys(getMetaFields(data[entityName]));

    const manyToOneResolvers = entityFields.filter(isRelationshipField).reduce(
        (resolvers, fieldName) => {
            return Object.assign({}, resolvers, {
                [getRelatedTypeName(fieldName)]: meta(ids[getRelatedTypeName(fieldName)])
            })
        },
        {}
    );

    const defaultResolvers = ['id', 'createdAt', 'createdBy'].reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: () => {
                    return {
                        name: fieldName
                    }
                }
            }),
        {}
    );

    const classicResolvers = entityFields.filter(x => !['id', 'createdAt', 'createdBy'].includes(x)).reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: (entity) => {
                    return isRelationshipField(fieldName) ?
                        entity[fieldName.substr(0, fieldName.length - 3)] :
                        entity[fieldName];
                }
            }),
        {}
    );

    const entities = Object.keys(data);
    const oneToManyResolvers = entities.reduce(
        // tslint:disable-next-line: no-shadowed-variable
        (resolvers, entityName) =>
            Object.assign({}, resolvers, Object.fromEntries(
                getReversedFields(data[entityName], id).map(x => {
                    return [getRelationshipFromKey(entityName), meta(ids[entityName])];
                })
            )
            )
        ,{}
    );

    return Object.assign({}, defaultResolvers, classicResolvers, manyToOneResolvers, oneToManyResolvers);
};

export default Meta;