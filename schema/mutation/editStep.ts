import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { contentType } from "../../const/contentType";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import protectedNames from "../../const/protectedNames";
import { StepType } from "../types";
import mongoose from 'mongoose';
import { Dashboard, Form, Step } from "../../models";

export default {
    /*  Finds a step from its id and update it, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: StepType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        type: { type: GraphQLString },
        content: { type: GraphQLID },
        permissions: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        if (args.name && protectedNames.indexOf(args.name.toLowerCase()) >= 0) {
            throw new GraphQLError(errors.usageOfProtectedName);
        }
        if (!args || (!args.name && !args.type && !args.content && !args.permissions)) {
            throw new GraphQLError(errors.invalidEditStepArguments);
        } else if (args.content) {
            let content = null;
            switch (args.type) {
                case contentType.dashboard:
                    content = await Dashboard.findById(args.content);
                    break;
                case contentType.form:
                    content = await Form.findById(args.content);
                    break;
                default:
                    break;
            }
            if (!content) throw new GraphQLError(errors.dataNotFound);
        }
        const user = context.user;
        const update = {
            modifiedAt: new Date()
        };
        Object.assign(update,
            args.name && { name: args.name },
            args.type && { type: args.type },
            args.content && { content: args.content },
            args.permissions && { permissions: args.permissions }
        );
        let step = null;
        if (checkPermission(user, permissions.canManageApplications)) {
            step = await Step.findByIdAndUpdate(
                args.id,
                update,
                { new: true }
            );
        } else {
            const filters = {
                'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            step = await Step.findOneAndUpdate(
                filters,
                update,
                { new: true }
            );
        }
        if (!step) throw new GraphQLError(errors.dataNotFound);
        if (step.type === contentType.dashboard) {
            // tslint:disable-next-line: no-shadowed-variable
            const update = {
                modifiedAt: new Date(),
            };
            Object.assign(update,
                args.name && { name: args.name },
            );
            await Dashboard.findByIdAndUpdate(step.content, update);
        }
        return step;
    }
}