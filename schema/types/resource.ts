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
        permissions: { type: AccessType },
        forms: {
            type: new GraphQLList(FormType),
            resolve(parent, args) {
                return Form.find({ resource: parent.id });
            },
        },
        coreForm: {
            type: FormType,
            resolve(parent, args) {
                return Form.find({ resource: parent.id, core: true });
            },
        },
        records: {
            type: new GraphQLList(RecordType),
            args: {
                filters: { type: GraphQLJSON },
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
                return ability.can('read', 'Resource');
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('create', 'Resource');
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', 'Resource');
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', 'Resource');
            }
        }
    }),
});