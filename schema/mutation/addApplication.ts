import { GraphQLNonNull, GraphQLString, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Application, Role } from "../../models";
import pubsub from "../../server/pubsub";
import checkPermission from "../../utils/checkPermission";
import { ApplicationType } from "../types";

export default {
    /*  Creates a new application.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApplicationType,
    args: {
        name: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canManageApplications)) {
            if (args.name !== '') {
                const application = new Application({
                    name: args.name,
                    createdAt: new Date(),
                    status: 'pending',
                    createdBy: user.id,
                    permissions: {
                        canSee: [],
                        canCreate: [],
                        canUpdate: [],
                        canDelete: []
                    }
                });
                await application.save();
                const publisher = await pubsub();
                publisher.publish('notification', {
                    notification: {
                        action: 'Application created',
                        content: application,
                        createdAt: new Date()
                    }
                });
                for (const name of ['Editor', 'Manager', 'Guest']) {
                    const role = new Role({
                        title: name,
                        application: application.id
                    });
                    await role.save();
                }
                return application;
            }
            throw new GraphQLError(errors.invalidAddApplicationArguments);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}