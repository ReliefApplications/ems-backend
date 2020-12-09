import getFields from "../../introspection/getFields";
import { getRelatedType, getRelatedKey, getReverseRelatedField, getRelationshipFromKey } from "../../introspection/getTypeFromKey";
import { isRelationshipField } from "../../introspection/isRelationshipField";
import { isNotRelationshipField } from "../../introspection/isNotRelationshipField";

export default (entityName, data) => {
    const entityFields = Object.keys(getFields(data[entityName]));

    // const manyToOneResolvers = entityFields.filter(isRelationshipField).reduce(
    //     (resolvers, fieldName) =>
    //         Object.assign({}, resolvers, {
    //             [getRelatedType(fieldName)]: (entity) => {
    //                 console.log('field');
    //                 console.log(entity);
    //                 return data[getRelatedKey(fieldName)].find(
    //                     (relatedRecord) => relatedRecord.id == entity[fieldName]
    //                 );
    //             }
    //         }),
    //     {}
    // );

    console.log(entityFields);

    const classicResolvers = entityFields.filter(isNotRelationshipField).filter(x => x !== 'id').reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: (entity) => {
                    return entity.data[fieldName];
                }
            }),
        {}
    );

    // const relatedField = getReverseRelatedField(entityName); // 'posts' => 'post_id'

    // const hasReverseRelationship = (entityName) =>
    //     Object.keys(getFields(data[entityName])).includes(
    //         relatedField
    //     );

    // const entities = Object.keys(data);
    // const oneToManyResolvers = entities.filter(hasReverseRelationship).reduce(
    //     (resolvers, entityName) =>
    //         Object.assign({}, resolvers, {
    //             [getRelationshipFromKey(entityName)]: (entity) => {
    //                 console.log('related');
    //                 console.log(relatedField);
    //                 return data[entityName].filter(
    //                     (record) => record[relatedField] == entity.id
    //                 );
    //             }
    //         }),
    //     {}
    // );

    return Object.assign({}, classicResolvers);
};