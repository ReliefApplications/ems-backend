import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import { Application } from "../../models";
import { ApplicationType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";

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
        const ability: AppAbility = context.user.ability;
        const filters = Application.accessibleBy(ability, 'update').where({_id: args.applicationId}).getFilter();
        const application = await Application.findOne(filters);
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