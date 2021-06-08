import { GraphQLBoolean, GraphQLID, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AccessType, FormType, RecordType } from '.';
import { Form, Record } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import getFilters from '../../utils/getFilters';

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
            resolve(parent) {
                return Form.find({ resource: parent.id });
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
            resolve(parent) {
                return Form.findOne({ resource: parent.id, core: true });
            },
        },
        records: {
            type: new GraphQLList(RecordType),
            args: {
                filters: {type: GraphQLJSON}
            },
            resolve(parent, args) {
                let filters: any = {
                    resource: parent.id
                };
                if (args.filters) {
                    const mongooseFilters = getFilters(args.filters, parent.fields);
                    filters = { ...filters, ...mongooseFilters };
                }
                return Record.find(filters);
            },
        },
        recordsCount: {
            type: GraphQLInt,
            resolve(parent) {
                return Record.find({ resource: parent.id }).count();
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
