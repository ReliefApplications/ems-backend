import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Application} from "../../models";
import checkPermission from "../../utils/checkPermission";
import { SubscriptionType } from "../types/subscription";

export default {
    /*  Deletes a role.
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

        if (checkPermission(user, permissions.canManageApplications)) {
           let application = await Application.findById(args.applicationId);

           const subscription = {
                routingKey: args.routingKey,
                title: args.title,
            };
            Object.assign(subscription,
                args.convertTo && { convertTo: args.convertTo },
                args.channel && { channel: args.channel }
            );

            application.subscriptions = await application.subscriptions.map( sub => {
                if(sub.routingKey === args.previousSubscription){
                    sub = subscription;
                }
                return sub;
            });

            await Application.findByIdAndUpdate(
                args.applicationId,
                application,
                {new: true}                
            );

            return subscription;

        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}