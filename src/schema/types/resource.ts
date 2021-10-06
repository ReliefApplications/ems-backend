import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AccessType, FormType, RecordType } from '.';
import { Form, Record } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { getFormFilter } from '../../utils/filter';

/**
 * GraphQL Resource type.
 */
export const ResourceType = new GraphQLObjectType({
    name: 'Resource',
    fields: () => ({
        id: {type: GraphQLID},
        name: {type: GraphQLString},
        createdAt: {type: GraphQLString},
        permissions: {
            type: AccessType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent) ? parent.permissions : null;
            }
        },
        forms: {
            type: new GraphQLList(FormType),
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Form.find({ resource: parent.id }).accessibleBy(ability, 'read');
            },
        },
        relatedForms: {
            type: new GraphQLList(FormType),
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Form.find({status: 'active', 'fields.resource': parent.id}).accessibleBy(ability, 'read');
            }
        },
        coreForm: {
            type: FormType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Form.findOne({ resource: parent.id, core: true }).accessibleBy(ability, 'read');
            },
        },
        records: {
            type: new GraphQLList(RecordType),
            args: {
                filters: { type: GraphQLJSON },
                archived: { type: GraphQLBoolean }
            },
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                let filters: any = {
                    resource: parent.id,
                    archived: args.archived ? true : { $ne: true }
                };
                if (args.filters) {
                    const mongooseFilters = getFormFilter(args.filters, parent.fields);
                    filters = { ...filters, ...mongooseFilters };
                }
                if (ability.can('read', parent) || ability.can('update', parent)) {
                    return Record.find(filters)
                } else {
                    return Record.find(filters).accessibleBy(ability, 'read');
                }
            },
        },
        recordsCount: {
            type: GraphQLInt,
            resolve(parent) {
                return Record.find({ resource: parent.id, archived: { $ne: true } }).count();
            },
        },
        fields: {type: GraphQLJSON},
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', parent);
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
