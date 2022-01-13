import { GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { User } from '../../models';
import { UserType } from '../types';

export default {
  /*  Returns user from logged user id.
        Throw GraphQL error if not logged.
    */
  type: UserType,
  resolve(parent, args, context) {
    const user = context.user;
    if (user) {
      console.log(user.id);
      console.log(user._id);
      return User.findById(user.id);
    } else {
      throw new GraphQLError(errors.userNotLogged);
    }
  },
};
