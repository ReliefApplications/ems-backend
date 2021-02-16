import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import { FormType } from "../types";
import mongoose from 'mongoose';
import { Form, Record, Version } from "../../models";
import errors from "../../const/errors";
import buildTypes from "../../utils/buildTypes";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Finds form from its id and delete it, and all records associated, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: FormType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const filters = Form.accessibleBy(ability, 'delete').where({_id: args.id}).getFilter();
        const form = await Form.findOne(filters);
        if (form) {
            // Deletes the versions associated to that form.
            await Version.deleteMany({ _id: { $in: form.versions.map(x => mongoose.Types.ObjectId(x))}});
            return Form.findByIdAndRemove(args.id, null, () => {
                // Also deletes the records associated to that form.
                Record.remove({ form: args.id }).exec();
                buildTypes()
            });
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}