import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Application, Channel, Form } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { SubscriptionType } from "../types/subscription";
import { ApplicationType } from "../types";

export default {
    /*  Deletes a role.
        Throws an error if not logged or authorized.
    */
    type: ApplicationType,
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
           application.subscriptions = await application.subscriptions.map( sub => {
               if(sub.routingKey === args.previousSubscription){
                    sub.routingKey = args.routingKey;
                    sub.title = args.title;
                    sub.convertTo = args.convertTo;
                    sub.channel = args.channel;
               }
               return sub;
            });
            await Application.findByIdAndUpdate(
                args.applicationId,
                application,
                {new: true}                
            );
            return application;
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}