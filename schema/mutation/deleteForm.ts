import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { FormType } from "../types";
import mongoose from 'mongoose';
import { Form, Record, Version } from "../../models";
import errors from "../../const/errors";

export default {
    /*  Finds form from its id and delete it, and all records associated, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: FormType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        let form = null;
        if (checkPermission(user, permissions.canManageForms)) {
            form = await Form.findById(args.id);
        } else {
            const filters = {
                'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            form = await Form.findOne(filters);
        }
        if (form) {
            // Deletes the versions associated to that form.
            await Version.deleteMany({ _id: { $in: form.versions.map(x => mongoose.Types.ObjectId(x))}});
            return Form.findByIdAndRemove(args.id, () => {
                // Also deletes the records associated to that form.
                Record.remove({ form: args.id }).exec();
            });
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}