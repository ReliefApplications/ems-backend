import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from 'graphql';
import { AccessType, ApplicationType } from '.';
import { ContentEnumType } from '../../const/enumTypes';
import { Application, Page } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export const PageType = new GraphQLObjectType({
    name: 'Page',
    fields: () => ({
        id: {
            type: GraphQLID,
            resolve(parent) {
                return parent._id;
            }
        },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        type: { type: ContentEnumType },
        content: { type: GraphQLID },
        permissions: {
            type: AccessType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent) ? parent.permissions : null;
            }
        },
        application: {
            type: ApplicationType,
            resolve(parent) {
                return Application.findOne( { pages: parent.id } );
            }
        },
        // TODO: fix all of that
        canSee: {
            type: GraphQLBoolean,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', new Page(parent));
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('create', new Page(parent));
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', new Page(parent));
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', new Page(parent));
            }
        }
    })
});