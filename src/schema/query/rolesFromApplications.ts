import { GraphQLList, GraphQLID, GraphQLError, GraphQLNonNull } from 'graphql';
import { Role } from '../../models';
import { RoleType } from '../types';
import errors from '../../const/errors';

export default {
    /*  List passed applications roles if user is logged, but only title and id.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(RoleType),
    args: {
        applications: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) }
    },
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        return Role.find({ application: { $in: args.applications } }).select('id title application');
    }
};
