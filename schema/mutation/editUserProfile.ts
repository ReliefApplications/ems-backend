import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { User } from "../../models";
import { UserProfileInputType } from "../inputs";
import { UserType } from "../types";

export default {
    /*  Edits an user's roles, providing its id and the list of roles.
        Throws an error if not logged or authorized.
    */
    type: UserType,
    args: {
        profile: { type: new GraphQLNonNull(UserProfileInputType) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const update = {};
        Object.assign(update,
            args.favoriteApp && { favoriteApp: args.favoriteApp },
            args.username && { username: args.username },
            args.name && { name: args.name }
        );
        return User.findByIdAndUpdate(user.id, update, { new: true});
    }
}