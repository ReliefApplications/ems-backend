import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLInt, GraphQLBoolean } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { AccessType, FormType, RecordType } from ".";
import { Form, Record } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export const ResourceType = new GraphQLObjectType({
    name: 'Resource',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        permissions: {
            type: AccessType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent) ? parent.permissions : null;
            }
        },
        forms: {
            type: new GraphQLList(FormType),
            resolve(parent, args) {
                return Form.find({ resource: parent.id });
            },
        },
        relatedForms: {
            type: new GraphQLList(FormType),
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Form.find({ status: 'active', 'fields.resource': parent.id }).accessibleBy(ability, 'read');
            }
        },
        coreForm: {
            type: FormType,
            resolve(parent, args) {
                return Form.findOne({ resource: parent.id, core: true });
            },
        },
        records: {
            type: new GraphQLList(RecordType),
            args: {
                filters: { type: GraphQLJSON },
                containsFilters: { type: GraphQLJSON },
                advancedFilters: { type: GraphQLJSON }
            },
            resolve(parent, args) {
                const filters = {
                    resource: parent.id
                };
                if (args.filters) {
                    for (const filter of args.filters) {
                        filters[`data.${filter.name}`] = filter.equals;
                    }
                }
                if (args.containsFilters) {
                    for (const filter of args.containsFilters) {
                        filters[`data.${filter.name}`] = { $regex: String(filter.value), $options: 'i' };
                    }
                }
                if (args.advancedFilters) {
                    for (const filter of args.advancedFilters) {
                        if (filter.value.trim().length === 0) {
                            filters[`data.${filter.field}`] = { $regex: filter.value, $options: 'i' };
                        } else if (filter.operator === 'eq') {
                            filters[`data.${filter.field}`] = {$eq: filter.value};
                        } else if (filter.operator === 'contains') {
                            filters[`data.${filter.field}`] = {$regex : `.*${filter.value}.*`};
                        } else if (filter.operator === 'gt') {
                            filters[`data.${filter.field}`] = {$gt: filter.value};
                        } else if (filter.operator === 'lt') {
                            filters[`data.${filter.field}`] = {$lt: filter.value};
                        } else if (filter.operator === 'gte') {
                            filters[`data.${filter.field}`] = {$gte: filter.value};
                        } else if (filter.operator === 'lte') {
                            filters[`data.${filter.field}`] = {$lte: filter.value};
                        }
                        console.log('FILTER', filters);
                    }
                }
                return Record.find(filters);
            },
        },
        recordsCount: {
            type: GraphQLInt,
            resolve(parent, args) {
                return Record.find({ resource: parent.id }).count();
            },
        },
        fields: { type: GraphQLJSON },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', parent);
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('create', parent);
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent);
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', parent);
            }
        }
    }),
});
