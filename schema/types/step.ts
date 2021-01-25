import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from "graphql";
import { AccessType, WorkflowType } from ".";
import { ContentEnumType } from "../../const/contentType";
import permissions from "../../const/permissions";
import { Workflow } from "../../models";
import checkPermission from "../../utils/checkPermission";

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
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canSee.some(x => roles.includes(x));
                }
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canUpdate.some(x => roles.includes(x));
                }
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canDelete.some(x => roles.includes(x));
                }
            }
        }
    })
});