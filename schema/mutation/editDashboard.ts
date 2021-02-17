import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import { DashboardType } from "../types";
import { Dashboard, Page, Step } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Finds dashboard from its id and update it, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: DashboardType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        structure: { type: GraphQLJSON },
        name: { type: GraphQLString },
    },
    async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (!args || (!args.name && !args.structure)) {
            throw new GraphQLError(errors.invalidEditDashboardArguments);
        } else {
            let update: { modifiedAt?: Date, structure?: any, name?: string} = {
                modifiedAt: new Date()
            };
            Object.assign(update,
                args.structure && { structure: args.structure },
                args.name && { name: args.name },
            );
            if (ability.can('update', 'Dashboard')) {
                const dashboard = await Dashboard.findByIdAndUpdate(
                    args.id,
                    update,
                    { new: true }
                );
                update = {
                    modifiedAt: dashboard.modifiedAt,
                    name: dashboard.name,
                };
                await Page.findOneAndUpdate(
                    { content: dashboard.id },
                    update
                );
                await Step.findOneAndUpdate(
                    { content: dashboard.id },
                    update
                );
                return dashboard;
            } else {
                const filtersPage = Page.accessibleBy(ability, 'update').where({content: args.id});
                const filtersStep = Step.accessibleBy(ability, 'update').where({content: args.id});
                update = {
                    modifiedAt: new Date()
                };
                Object.assign(update,
                    args.name && { name: args.name },
                    );
                const page = await Page.findOneAndUpdate(filtersPage, update);
                const step = await Step.findOneAndUpdate(filtersStep, update);
                if (page || step) {
                    Object.assign(update,
                        args.structure && { structure: args.structure },
                    );
                    return Dashboard.findByIdAndUpdate(
                        args.id,
                        update,
                        { new: true }
                    );
                }
                throw new GraphQLError(errors.permissionNotGranted);
            }
        }
    },
}