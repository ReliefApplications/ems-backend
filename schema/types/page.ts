import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from "graphql";
import { AccessType, ApplicationType } from ".";
import { ContentEnumType } from "../../const/contentType";
import { Application } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export const PageType = new GraphQLObjectType({
    name: 'Page',
    fields: () => ({
        id: {
            type: GraphQLID,
            resolve(parent, args) {
                return parent._id;
            }
        },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        type: { type: ContentEnumType },
        content: { type: GraphQLID },
        permissions: { type: AccessType },
        application: {
            type: ApplicationType,
            resolve(parent, args) {
                return Application.findOne( { pages: parent.id } );
            }
        },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', 'Page');
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('create', 'Page');
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', 'Page');
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', 'Page');
            }
        }
    })
});