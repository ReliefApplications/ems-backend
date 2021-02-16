import { getMetaFields } from "../../introspection/getFields";
import getReversedFields from "../../introspection/getReversedFields";
import { getRelatedMetaTypeName, getRelationshipFromKey } from "../../introspection/getTypeFromKey";
import { isRelationshipField } from "../../introspection/isRelationshipField";

export default (entityName, data, id, ids) => {

    const entityFields = Object.keys(getMetaFields(data[entityName]));

    const manyToOneResolvers = entityFields.filter(isRelationshipField).reduce(
        (resolvers, fieldName) => {
            return Object.assign({}, resolvers, {
                [getRelatedMetaTypeName(fieldName)]: (entity, args, context) => {
                    // const recordId = entity.data[fieldName.substr(0, fieldName.length - 3)];
                    // return recordId ? Record.findById(recordId) : null;
                    return null;
                }
            })
        },
        {}
    );

    const defaultResolvers = ['id', 'createdAt'].reduce(
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

    const classicResolvers = entityFields.filter(x => !['id', 'createdAt'].includes(x)).reduce(
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
                    return [getRelationshipFromKey(entityName), (entity, args = {}, context) => {
                        // const mongooseFilter = args.filter ? getFilter(args.filter) : {};
                        // Object.assign(mongooseFilter,
                        //     { $or: [ { resource: ids[entityName] }, { form: ids[entityName] } ] }
                        // );
                        // mongooseFilter[`data.${x}`] = entity.id;
                        // return Record.find(mongooseFilter)
                        //     .sort([[getSortField(args.sortField), args.sortOrder]])
                        return null;
                    }];
                })
            )
            )
        ,{}
    );

    return Object.assign({}, defaultResolvers, classicResolvers, manyToOneResolvers, oneToManyResolvers);
};