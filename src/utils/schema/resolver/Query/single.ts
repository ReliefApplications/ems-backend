import { GraphQLError } from 'graphql';
import errors from '../../../../const/errors';
import { Record } from '../../../../models'

export default () => (_, { id }, context) => {
    const user = context.user;
    if (!user) {
        throw new GraphQLError(errors.userNotLogged);
    }
    return Record.findById(id);
}
