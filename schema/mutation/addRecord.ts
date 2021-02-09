import { GraphQLID, GraphQLNonNull, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { RecordType } from "../types";
import mongoose from 'mongoose';
import { Form, Record } from "../../models";
import transformRecord from "../../utils/transformRecord";
export default {
    /*  Adds a record to a form, if user authorized.
        Throws a GraphQL error if not logged or authorized, or form not found.
    */
    type: RecordType,
    args: {
        form: { type: GraphQLID },
        data: { type: new GraphQLNonNull(GraphQLJSON) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        let form = null;
        if (checkPermission(user, permissions.canManageForms)) {
            form = await Form.findById(args.form);
            if (!form) throw new GraphQLError(errors.dataNotFound);
        } else {
            const filters = {
                'permissions.canCreate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.form
            };
            form = await Form.findOne(filters);
            if (!form) throw new GraphQLError(errors.permissionNotGranted);
        }
        const test = transformRecord(args.data, form.fields);
        const record = new Record({
            form: args.form,
            createdAt: new Date(),
            modifiedAt: new Date(),
            data: args.data,
            resource: form.resource ? form.resource : null,
        });
        await record.save();
        return record;
    },
}