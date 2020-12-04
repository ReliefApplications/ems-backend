import { GraphQLNonNull, GraphQLID } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { FormType } from "../types";
import Form from '../../models/form';
import mongoose from 'mongoose';

export default {
    /*  Returns form from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: FormType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeForms)) {
            return Form.findById(args.id);
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            return Form.findOne(filters);
        }
    },
}