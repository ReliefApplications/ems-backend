import { GraphQLList, GraphQLBoolean, GraphQLError } from "graphql";
import { contentType } from "../../const/contentType";
import errors from "../../const/errors";
import { Page, Step, Dashboard } from "../../models";
import { DashboardType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  List all dashboards available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(DashboardType),
    args: {
        all: { type: GraphQLBoolean }
    },
    async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const filters = {};
        if (!args.all) {
            const contentIds = await Page.find({
                'type': { $eq: contentType.dashboard },
                'content': { $ne: null }
            }).distinct('content');
            const stepIds = await Step.find({
                'type': { $eq: contentType.dashboard },
                'content': { $ne: null }
            }).distinct('content');
            Object.assign(filters, { _id: { $nin: contentIds.concat(stepIds) } });
        }
        if (ability.can('read', 'Dashboard')) {
            return Dashboard.find(filters);
        } 
    },
}