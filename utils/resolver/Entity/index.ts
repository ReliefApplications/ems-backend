import getFields from "../../introspection/getFields";
import { getRelationshipFromKey, getRelatedTypeName } from "../../introspection/getTypeFromKey";
import { isRelationshipField } from "../../introspection/isRelationshipField";
import { Form, Record, User } from "../../../models";
import getReversedFields from "../../introspection/getReversedFields";
import getFilter from "../Query/getFilter";
import getSortField from "../Query/getSortField";
import { defaultFields } from "../../../const/defaultRecordFields";
import getPermissionFilters from "../../getPermissionFilters";
import { AppAbility } from "../../../security/defineAbilityFor";

export default (entityName, data, id, ids) => {

    const entityFields = Object.keys(getFields(data[entityName]));

    const manyToOneResolvers = entityFields.filter((fieldName) => fieldName.endsWith('_id')).reduce(
        (resolvers, fieldName) => {
            return Object.assign({}, resolvers, {
                [getRelatedTypeName(fieldName)]: (entity, args, context) => {
                    const recordId = entity.data[fieldName.substr(0, fieldName.length - 3 )];
                    return recordId ? Record.findById(recordId) : null;
                }
            })
        },
        {}
    );

    const manyToManyResolvers = entityFields.filter((fieldName) => fieldName.endsWith('_ids')).reduce(
        (resolvers, fieldName) => {
            return Object.assign({}, resolvers, {
                [getRelatedTypeName(fieldName)]: (entity, args = { sortField: null, sortOrder: 'asc', filter: {} }, context) => {
                    const mongooseFilter = args.filter ? getFilter(args.filter) : {};
                    const recordIds = entity.data[fieldName.substr(0, fieldName.length - 4 )];
                    Object.assign(mongooseFilter,
                        { _id: { $in: recordIds } }
                    );
                    return Record.find(mongooseFilter)
                        .sort([[getSortField(args.sortField), args.sortOrder]]);
                }
            })
        },
        {}
    );

    const classicResolvers = entityFields.filter(x => !defaultFields.includes(x)).reduce(
        (resolvers, fieldName) =>
            Object.assign({}, resolvers, {
                [fieldName]: (entity) => {
                    return isRelationshipField(fieldName) ?
                        entity.data[fieldName.substr(0, fieldName.length - (fieldName.endsWith('_id') ? 3 : 4))] :
                        entity.data[fieldName];
                }
            }),
        {}
    );

    const createdByResolver = {
        createdBy: (entity) => {
            if (entity.createdBy && entity.createdBy.user) {
                return User.findById(entity.createdBy.user);
            }
        }
    }

    const canUpdateResolver = {
        canUpdate: async (entity, args, context) => {
            const user = context.user;
            const ability: AppAbility = user.ability;
            if (ability.can('update', new Record(entity))) {
                return true
            } else {
                const form = await Form.findById(entity.form);
                const permissionFilters = getPermissionFilters(user, form, 'canUpdateRecords');
                return permissionFilters.length ? Record.exists({ $and: [{ _id: entity.id}, { $or: permissionFilters }] }) : false;
            }
        }
    }

    const canDeleteResolver = {
        canDelete: async (entity, args, context) => {
            const user = context.user;
            const ability: AppAbility = user.ability;
            if (ability.can('delete', new Record(entity))) {
                return true;
            } else {
                const form = await Form.findById(entity.form);
                const permissionFilters = getPermissionFilters(user, form, 'canDeleteRecords');
                return permissionFilters.length ? Record.exists({ $and: [{ _id: entity.id}, { $or: permissionFilters }] }) : false;
            }
        }
    }

    const entities = Object.keys(data);
    const oneToManyResolvers = entities.reduce(
        // tslint:disable-next-line: no-shadowed-variable
        (resolvers, entityName) =>
            Object.assign({}, resolvers, Object.fromEntries(
                getReversedFields(data[entityName], id).map(x => {
                    return [getRelationshipFromKey(entityName), (entity, args = { sortField: null, sortOrder: 'asc', filter: {} }, context) => {
                        const mongooseFilter = args.filter ? getFilter(args.filter) : {};
                        Object.assign(mongooseFilter,
                            { $or: [ { resource: ids[entityName] }, { form: ids[entityName] } ] }
                        );
                        mongooseFilter[`data.${x}`] = entity.id.toString();
                        return Record
                            .aggregate([
                                {
                                    $match: mongooseFilter
                                },
                                {
                                    $addFields: {
                                        id: "$_id"
                                    }
                                },
                                {
                                    $sort: { [getSortField(args.sortField)]: (args.sortOrder === 'asc') ? 1 : -1 }
                                }
                            ]);
                    }];
                })
            )
            )
        ,{}
    );

    return Object.assign({}, classicResolvers, createdByResolver, canUpdateResolver, canDeleteResolver, manyToOneResolvers, manyToManyResolvers, oneToManyResolvers);
};