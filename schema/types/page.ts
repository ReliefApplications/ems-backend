import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from "graphql";
import { AccessType, ApplicationType } from ".";
import { ContentEnumType } from "../../const/contentType";
import permissions from "../../const/permissions";
import { Application } from "../../models";
import checkPermission from "../../utils/checkPermission";

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