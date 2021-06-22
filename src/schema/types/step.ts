import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from 'graphql';
import { AccessType, WorkflowType } from '.';
import { ContentEnumType } from '../../const/enumTypes';
import { Step, Workflow } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export const StepType = new GraphQLObjectType({
    name: 'Step',
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
        type: {type: ContentEnumType},
        content: { type: GraphQLID },
        // TODO: doesn't work
        permissions: {
            type: AccessType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent) ? parent.permissions : null;
            }
        },
        workflow: {
            type: WorkflowType,
            resolve(parent) {
                return Workflow.findOne({ steps: parent.id });
            }
        },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', new Step(parent));
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', new Step(parent));
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', new Step(parent));
            }
        }
    })
});
