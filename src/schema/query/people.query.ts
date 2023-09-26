import { GraphQLList, GraphQLError, GraphQLID } from 'graphql';
import { UserType } from '../types';
import { logger } from '@services/logger.service';

/**
 * People mock query
 */
export default {
  type: new GraphQLList(UserType), //this should be PersonType
  args: {
    applications: { type: new GraphQLList(GraphQLID) },
  },
  resolve(parent, args, context) {
    try {
      // return a test user
      return [
        {
          _id: '5f9a9b9b9b9b9b9b9b9b9b9b',
          username: 'John Doe',
          name: 'John Doe',
          email: 'JohnDoe@test.com',
          oid: '5f9a9b9b9b9b9b9b9b9b9b9b',
        },
        {
          _id: '6f9a9b9b9b9b9b9b9b9b9b9b',
          username: 'Jane Doe',
          name: 'Jane Doe',
          email: 'JaneDoe@test.com',
          oid: '6f9a9b9b9b9b9b9b9b9b9b9b',
        },
      ];
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
