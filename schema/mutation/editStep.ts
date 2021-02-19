import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { contentType } from "../../const/contentType";
import errors from "../../const/errors";
import { StepType } from "../types";
import { Dashboard, Form, Step } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

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
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
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
        const update = {
            modifiedAt: new Date()
        };
        Object.assign(update,
            args.name && { name: args.name },
            args.type && { type: args.type },
            args.content && { content: args.content },
            args.permissions && { permissions: args.permissions }
        );
        const filters = Step.accessibleBy(ability, 'update').where({_id: args.id}).getFilter();
        const step = await Step.findOneAndUpdate(
            filters,
            update,
            { new: true }
        );
        if (!step) { throw new GraphQLError(errors.dataNotFound); }
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