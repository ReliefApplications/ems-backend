import getFields from "../../introspection/getFields";
import { getRelatedType, getRelatedKey, getReverseRelatedField, getRelationshipFromKey } from "../../introspection/getTypeFromKey";
import { isRelationshipField } from "../../introspection/isRelationshipField";

export default (entityName, data) => {
    const entityFields = Object.keys(getFields(data[entityName]));
    const manyToOneResolvers = entityFields.filter(isRelationshipField).reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [getRelatedType(fieldName)]: (entity) => {
                    console.log('field');
                    console.log(fieldName);
                    return data[getRelatedKey(fieldName)].find(
                        (relatedRecord) => relatedRecord.id == entity[fieldName]
                    );
                }
            }),
        {}
    );

    const relatedField = getReverseRelatedField(entityName); // 'posts' => 'post_id'

    const hasReverseRelationship = (entityName) =>
        Object.keys(getFields(data[entityName])).includes(
            relatedField
        );

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

    return Object.assign({}, manyToOneResolvers, oneToManyResolvers);
};