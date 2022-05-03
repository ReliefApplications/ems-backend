import { GraphQLError } from 'graphql';
import { Record } from '../../../../models';

export default () =>
  (_, { id }, context) => {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    return Record.findOne({ _id: id, archived: { $ne: true } });
  };
