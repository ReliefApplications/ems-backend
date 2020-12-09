import getFields from "../../introspection/getFields";
import { getRelatedType, getRelatedKey, getReverseRelatedField, getRelationshipFromKey, getRelatedTypeName } from "../../introspection/getTypeFromKey";
import { isRelationshipField } from "../../introspection/isRelationshipField";
import { isNotRelationshipField } from "../../introspection/isNotRelationshipField";
import { Record } from "../../../models";
import getReversedFields from "../../introspection/getReversedFields";

export default (entityName, data, id, ids) => {

    const entityFields = Object.keys(getFields(data[entityName]));

    const manyToOneResolvers = entityFields.filter(isRelationshipField).reduce(
        (resolvers, fieldName) => {
            return Object.assign({}, resolvers, {
                [getRelatedTypeName(fieldName)]: (entity) => {
                    const id = entity.data[fieldName.substr(0, fieldName.length - 3)];
                    return id ? Record.findById(id) : null;
                }
            })
        },
        {}
    );

    const classicResolvers = entityFields.filter(isNotRelationshipField).filter(x => x !== 'id').reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: (entity) => {
                    return entity.data[fieldName];
                }
            }),
        {}
    );

    const entities = Object.keys(data);
    const oneToManyResolvers = entities.reduce(
        (resolvers, entityName) =>
            Object.assign({}, resolvers, Object.fromEntries(
                getReversedFields(data[entityName], id).map(x => {
                    console.log(ids[entityName]);
                    return [getRelationshipFromKey(entityName), (entity) => {
                        const filters = { resource: ids[entityName] };
                        filters[`data.${x}`] = entity.id;
                        return Record.find(filters);
                    }];
                })
            )
            )
        ,{}
    );

    return Object.assign({}, classicResolvers, manyToOneResolvers, oneToManyResolvers);
};