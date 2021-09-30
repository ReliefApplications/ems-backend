import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AccessType, PageType, StepType } from '.';
import { Page, Step } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

export const DashboardType = new GraphQLObjectType({
    name: 'Dashboard',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        structure: { type: GraphQLJSON },
        permissions: {
            type: AccessType,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                if (ability.can('update', parent)) {
                    const page = await Page.findOne({ content: parent.id })
                    if (page) return page.permissions;
                    const step = await Step.findOne({ content: parent.id })
                    return step.permissions;
                } else {
                    return null;
                }
            }
        },
        page: {
            type: PageType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Page.findOne({ content: parent.id }).accessibleBy(ability, 'read');
            }
        },
        step: {
            type : StepType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Step.findOne({ content: parent.id }).accessibleBy(ability, 'read');
            }
        },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                if (ability.can('read', parent)) {
                    return true;
                } else if (context.user.isAdmin){
                    return canAccessContent(parent.id, 'read', ability);
                }
                return false;
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                if (ability.can('update', parent)) {
                    return true;
                } else if (context.user.isAdmin){
                    return canAccessContent(parent.id, 'update', ability);
                }
                return false;
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                if (ability.can('delete', parent)) {
                    return true;
                } else if (context.user.isAdmin){
                    return canAccessContent(parent.id, 'delete', ability);
                }
                return false;
            }
        }
    })
});
