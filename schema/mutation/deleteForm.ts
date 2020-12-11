import { GraphQLNonNull, GraphQLID } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { FormType } from "../types";
import mongoose from 'mongoose';
import { Form, Record, Version } from "../../models";

export default {
    /*  Finds form from its id and delete it, and all records associated, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: FormType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canManageForms)) {
            return Form.findByIdAndRemove(args.id, () => {
                // Also deletes the records associated to that form.
                Record.remove({ form: args.id }).exec();
            });
        } else {
            const filters = {
                'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            return Form.findOneAndRemove(filters, (res) => {
                // Also deletes the records associated to that form.
                Record.remove({ form: args.id }).exec();
                //Version.remove({ id: { $in: }})
            });
        }
    },
}