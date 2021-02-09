import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Application } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { ApplicationType } from "../types";
import mongoose from 'mongoose';

export default {
    /*  Deletes a subscription.
        Throws an error if not logged or authorized.
    */
    type: ApplicationType,
    args: {
        applicationId: { type: new GraphQLNonNull(GraphQLID) },
        routingKey: { type: new GraphQLNonNull(GraphQLString) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        let application: any;
        if (checkPermission(user, permissions.canManageApplications)) {
            application = await Application.findById(args.applicationId);
        } else {
            const filters = {
                'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.application
            };
            application = await Application.findOne(filters);
        }
        if (!application) throw new GraphQLError(errors.dataNotFound);
        application.subscriptions = await application.subscriptions.filter( sub => sub.routingKey !== args.routingKey);
        await Application.findByIdAndUpdate(
            args.applicationId,
            application,
            {new: true}
        );
        return application;
    }
}