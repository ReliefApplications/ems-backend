import { GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";
import errors from "../../const/errors";
import { User } from "../../models";
import { UserType } from "../types";

export default {
    /*  Deletes a user from application.
        Throws an error if not logged or authorized.
    */
    type: new GraphQLList(UserType),
    args: {
        usernames: { type: new GraphQLNonNull(new GraphQLList(GraphQLString)) },
        roles: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const updatedUsers: User[] = [];
        for (const username of args.usernames) {
            const registerUser = await User.findOne({ username });
            if (registerUser) {
                registerUser.roles = registerUser.roles.filter(r => !args.roles.includes(r.toString()));
                await User.findOneAndUpdate({ username }, {roles: registerUser.roles});
                updatedUsers.push(registerUser);
            }
        }

        return updatedUsers;
    }
}
