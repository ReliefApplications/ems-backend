import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLBoolean } from 'graphql';
import { Step, Page } from '../../models';
import { AccessType, PageType } from '../types';
import { StepType } from '.';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

export const WorkflowType = new GraphQLObjectType({
    name: 'Workflow',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        steps: {
            type: new GraphQLList(StepType),
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                let filter = Step.accessibleBy(ability, 'read').getFilter();
                // If it's a BO user and it can see the parent application, it can see all the pages, if not we apply CASL permissions
                if (context.user.isAdmin && await canAccessContent(parent.id, 'read', ability)) {
                    filter = {};
                }
                const steps = await Step.aggregate([
                    {
                        '$match': {
                            $and: [
                                filter,
                                { '_id': { '$in': parent.steps } }
                            ]
                        }
                    },
                    { '$addFields' : { '__order' : { '$indexOfArray': [ parent.steps, '$_id' ] } } },
                    { '$sort' : { '__order' : 1 } }
                ]);
                return steps;
            }
        },
        permissions: {
            type: AccessType,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                const page = await Page.findOne({ content: parent.id }, 'id permissions');
                if (ability.can('update', page) || context.user.isAdmin && await canAccessContent(parent.id, 'read', ability)) {
                    const page = await Page.findOne({ content: parent.id });
                    if (page) return page.permissions;
                    const step = await Step.findOne({ content: parent.id });
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
        canSee: {
            type: GraphQLBoolean,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                const page = await Page.findOne({ content: parent.id }, 'id permissions');
                if (ability.can('read', page)) {
                    return true;
                } else if (context.user.isAdmin){
                    return canAccessContent(parent.id, 'read', ability);
                }
                return false;
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                const page = await Page.findOne({ content: parent.id }, 'id permissions');
                if (ability.can('update', page)) {
                    return true;
                } else if (context.user.isAdmin){
                    return canAccessContent(parent.id, 'update', ability);
                }
                return false;
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                const page = await Page.findOne({ content: parent.id }, 'id permissions');
                if (ability.can('delete', page)) {
                    return true;
                } else if (context.user.isAdmin){
                    return canAccessContent(parent.id, 'delete', ability);
                }
                return false;
            }
        }
    })
});
