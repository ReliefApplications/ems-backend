import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from "graphql";
import { AccessType, WorkflowType } from ".";
import { ContentEnumType } from "../../const/contentType";
import { Workflow } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export const StepType = new GraphQLObjectType({
    name: 'Step',
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
        type: {type: ContentEnumType},
        content: { type: GraphQLID },
        permissions: { type: AccessType },
        workflow: {
            type: WorkflowType,
            resolve(parent, args) {
                return Workflow.findOne({ steps: parent.id });
            }
        },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', 'Step');
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', 'Step');
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', 'Step');
            }
        }
    })
});