import { GraphQLNonNull, GraphQLString, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Application, Role, Channel } from "../../models";
import checkPermission from "../../utils/checkPermission";
import validateName from "../../utils/validateName";
import { ApplicationType } from "../types";
import duplicatePages from "../../services/duplicatePages"

export default {
    /*  Creates a new application from a given id
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApplicationType,
    args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        previousId: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve(parent, args, context) {
        validateName(args.name);
        const user = context.user;

        if (checkPermission(user, permissions.canManageApplications)) {
            const baseApplication = await Application.findById(args.previousId);
            const copiedPages = await duplicatePages(args.previousId);
            if (!baseApplication) throw new GraphQLError(errors.dataNotFound);
            if (args.name !== '') {
                const application = new Application({
                    name: args.name,
                    createdAt: new Date(),
                    status: 'pending',
                    createdBy: user.id,
                    pages: copiedPages,
                    permissions: {
                        canSee: baseApplication.permissions.canSee,
                        canCreate: baseApplication.permissions.canCreate,
                        canUpdate: baseApplication.permissions.canUpdate,
                        canDelete: baseApplication.permissions.canDelete
                    },
                });
                await application.save();

                // Copy Channels
                const appChannels = await Channel.find({ application: baseApplication.id });
                await Promise.all(appChannels.map( async c => {
                    const tempChannel = new Channel({
                        title: c.title,
                        application: application._id
                    })
                    await tempChannel.save();
                    return c;
                }))

                // Create roles
                const roles = await Role.find({ application: baseApplication._id });
                for (const name of roles) {
                    const role = new Role({
                        title: name.title,
                        application: application.id,
                        channels: name.channels
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