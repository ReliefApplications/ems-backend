import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLList, GraphQLString } from "graphql";
import { FormType } from "../types";
import mongoose from 'mongoose';
import { Form, Record, Resource, Version } from "../../models";
import errors from "../../const/errors";
import buildTypes from "../../utils/buildTypes";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Finds form from its id and delete it, and all records associated, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: new GraphQLList(FormType),
    args: {
        id: {type: new GraphQLNonNull(GraphQLID)},
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }

        const ability: AppAbility = context.user.ability;
        const filters = Form.accessibleBy(ability, 'delete').where({_id: args.id}).getFilter();
        const form = await Form.findOne(filters);
        if (form) {
            let linkedForms = [];
            // Delete the versions associated to that form.
            await Version.deleteMany({ _id: { $in: form.versions.map(x => mongoose.Types.ObjectId(x))}});
            // if is core form we have to delete the linked forms and resource
            if (form.core === true) {
                linkedForms = await Form.find({resource: mongoose.Types.ObjectId(form.resource)});
                // delete linked forms
                await Form.deleteMany({resource: mongoose.Types.ObjectId(form.resource)});
                // delete resource
                await Resource.deleteOne({_id: form.resource});
            }
            await Form.findByIdAndRemove(args.id, null, ()  => {
                // Also deletes the records associated to that form.
                Record.remove({ form: args.id }).exec();
                buildTypes()
            });
            return linkedForms;
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}
