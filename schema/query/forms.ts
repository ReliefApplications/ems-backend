import { GraphQLList } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { FormType } from "../types";
import mongoose from 'mongoose';
import { Form } from "../../models";

export default {
    /*  List all forms available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(FormType),
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeForms)) {
            return Form.find({});
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) }
            };
            return Form.find(filters);
        }
    },
}