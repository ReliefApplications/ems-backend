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
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                const page = await Page.findOne(Page.accessibleBy(ability).where({ content: parent.id }).getFilter());
                if (!page) {
                    // If user is admin and can see parent application, it has access to it
                    if (context.user.isAdmin && await canAccessContent(parent.id, 'read', ability)) {
                        return Page.findOne({ content: parent.id });
                    }
                } else {
                    return page;
                }
            }
        },
        step: {
            type : StepType,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                const page = await Step.findOne(Step.accessibleBy(ability).where({ content: parent.id }).getFilter());
                if (!page) {
                    // If user is admin and can see parent application, it has access to it
                    if (context.user.isAdmin && await canAccessContent(parent.id, 'read', ability)) {
                        return Step.findOne({ content: parent.id });
                    }
                } else {
                    return page;
                }
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
