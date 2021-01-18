import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { DashboardType } from "../types";
import mongoose from 'mongoose';
import { Dashboard, Page, Step } from "../../models";

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
        if (!args || (!args.name && !args.structure)) {
            throw new GraphQLError(errors.invalidEditDashboardArguments);
        } else {
            const user = context.user;
            let update: { modifiedAt?: Date, structure?: any, name?: string} = {
                modifiedAt: new Date()
            };
            Object.assign(update,
                args.structure && { structure: args.structure },
                args.name && { name: args.name },
            );
            if (checkPermission(user, permissions.canManageApplications)) {
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
                const filters = {
                    'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                    content: args.id
                };
                update = {
                    modifiedAt: new Date()
                };
                Object.assign(update,
                    args.name && { name: args.name },
                );
                const page = await Page.findOneAndUpdate(filters, update);
                const step = await Step.findOneAndUpdate(filters, update);
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