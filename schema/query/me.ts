import { GraphQLError } from "graphql";
import errors from "../../const/errors";
import { UserType } from "../types";
import User from '../../models/user';

export default {
    /*  Returns user from logged user id.
        Throw GraphQL error if not logged.
    */
    type: UserType,
    resolve(parent, args, context) {
        const user = context.user;
        if (user) {
            return User.findById(user.id);
        } else {
            throw new GraphQLError(errors.userNotLogged);
        }
    }
}