import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList } from 'graphql';
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
                if (context.user.isAdmin && canAccessContent(parent.id, 'read', ability)) {
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
                const page = await Page.findOne({ content: parent.id })
                return ability.can('update', page) ? page.permissions : null;
            }
        },
        page: {
            type: PageType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Page.findOne({ content: parent.id }).accessibleBy(ability, 'read');
            }
        }
    })
});
