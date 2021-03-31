import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLList } from "graphql";
import errors from "../../const/errors";
import { Role, User } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { RoleType, UserType } from "../types";

export default {
    /*  Deletes a user.
        Throws an error if not logged or authorized.
    */
    type: UserType,
    args: {
        ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        await User.deleteMany({_id: {$in: args.ids}});
    }
}
