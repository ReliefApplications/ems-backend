import { GraphQLList, GraphQLID, GraphQLError, GraphQLNonNull } from 'graphql';
import { Application } from '../../models';
import { ApplicationType } from '../types';
import errors from '../../const/errors';

export default {
    /*  List passed applications users if user is logged, but only username and id.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ApplicationType),
    args: {
        applications: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) }
    },
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        return Application.find({ _id: { $in: args.applications } }).select('id username users');
    }
}
