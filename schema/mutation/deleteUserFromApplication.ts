import { GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";
import errors from "../../const/errors";
import { User } from "../../models";
import { UserType } from "../types";

export default {
    /*  Deletes a user from application.
        Throws an error if not logged or authorized.
    */
    type: UserType,
    args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        roles: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const registerUser = await User.findOne({'username': args.username });
        if (!registerUser) throw new GraphQLError(errors.dataNotFound);
        registerUser.roles = registerUser.roles.filter(r => !args.roles.includes(r.toString()));
        await User.findOneAndUpdate({'username': args.username}, {roles: registerUser.roles});
        return registerUser;
    }
}
