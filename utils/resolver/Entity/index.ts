import getFields from "../../introspection/getFields";
import { getRelatedType, getRelatedKey, getReverseRelatedField, getRelationshipFromKey, getRelatedTypeName } from "../../introspection/getTypeFromKey";
import { isRelationshipField } from "../../introspection/isRelationshipField";
import { isNotRelationshipField } from "../../introspection/isNotRelationshipField";
import { Record } from "../../../models";

export default (entityName, data) => {
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

    const relatedField = getReverseRelatedField(entityName); // 'posts' => 'post_id'

    const hasReverseRelationship = (entityName) =>
        Object.keys(getFields(data[entityName])).includes(
            relatedField
        );

    console.log(Object.keys(data).filter(hasReverseRelationship));

    const entities = Object.keys(data);
    const oneToManyResolvers = entities.filter(hasReverseRelationship).reduce(
        (resolvers, entityName) =>
            Object.assign({}, resolvers, {
                [getRelationshipFromKey(entityName)]: (entity) => {
                    console.log('related');
                    console.log(relatedField);
                    return data[entityName].filter(
                        (record) => record[relatedField] == entity.id
                    );
                }
            }),
        {}
    );

    return Object.assign({}, classicResolvers, manyToOneResolvers, oneToManyResolvers);
};