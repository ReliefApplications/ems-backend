import getFields from "../../introspection/getFields";
import { getRelationshipFromKey, getRelatedTypeName } from "../../introspection/getTypeFromKey";
import { isRelationshipField } from "../../introspection/isRelationshipField";
import { isNotRelationshipField } from "../../introspection/isNotRelationshipField";
import { Record } from "../../../models";
import getReversedFields from "../../introspection/getReversedFields";
import getFilter from "../Query/getFilter";

export default (entityName, data, id, ids) => {

    const entityFields = Object.keys(getFields(data[entityName]));

    const manyToOneResolvers = entityFields.filter(isRelationshipField).reduce(
        (resolvers, fieldName) => {
            return Object.assign({}, resolvers, {
                [getRelatedTypeName(fieldName)]: (entity, args, context) => {
                    const id = entity.data[fieldName.substr(0, fieldName.length - 3)];
                    return id ? Record.findById(id) : null;
                }
            })
        },
        {}
    );

    const classicResolvers = entityFields.filter(x => x !== 'id').reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: (entity) => {
                    return isRelationshipField(fieldName) ?
                        entity.data[fieldName.substr(0, fieldName.length - 3)] :
                        entity.data[fieldName];
                }
            }),
        {}
    );

    const entities = Object.keys(data);
    const oneToManyResolvers = entities.reduce(
        (resolvers, entityName) =>
            Object.assign({}, resolvers, Object.fromEntries(
                getReversedFields(data[entityName], id).map(x => {
                    return [getRelationshipFromKey(entityName), (entity, args, context) => {
                        const mongooseFilter = args.filter ? getFilter(args.filter) : {};
                        Object.assign(mongooseFilter,
                            { $or: [ { resource: ids[entityName] }, { form: ids[entityName] } ] }
                        );
                        mongooseFilter[`data.${x}`] = entity.id;
                        return Record.find(mongooseFilter);
                    }];
                })
            )
            )
        ,{}
    );

    return Object.assign({}, classicResolvers, manyToOneResolvers, oneToManyResolvers);
};