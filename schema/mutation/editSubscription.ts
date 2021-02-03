import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Application } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { SubscriptionType } from "../types/subscription";
import mongoose from 'mongoose';

export default {
    /*  Edits a subscription.
        Throws an error if not logged or authorized.
    */
    type: SubscriptionType,
    args: {
        applicationId: { type: new GraphQLNonNull(GraphQLID) },
        routingKey: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        convertTo: { type: new GraphQLNonNull(GraphQLString) },
        channel: { type: new GraphQLNonNull(GraphQLString) },
        previousSubscription: { type: new GraphQLNonNull(GraphQLString) },
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
        const subscription = {
            routingKey: args.routingKey,
            title: args.title,
        };
        Object.assign(subscription,
            args.convertTo && { convertTo: args.convertTo },
            args.channel && { channel: args.channel }
        );

        application.subscriptions = await application.subscriptions.map(sub => {
            if (sub.routingKey === args.previousSubscription) {
                sub = subscription;
            }
            return sub;
        });

        await Application.findByIdAndUpdate(
            args.applicationId,
            application,
            { new: true }
        );

        return subscription;
    }
}