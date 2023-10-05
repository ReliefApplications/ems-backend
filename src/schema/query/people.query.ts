import { GraphQLList, GraphQLError, GraphQLID } from 'graphql';
import { PeopleType } from '../types/people.type';
import { logger } from '@services/logger.service';

/** Temporary test mocked people awaiting for real data */
export const MockedPeople = [
  {
    _id: '5f9a9b9b9b9b9b9b9b9b9b9b',
    emailaddress: 'JohnDoe@test.com',
    firstname: 'John',
    lastname: 'Doe',
    oid: '5f9a9b9b9b9b9b9b9b9b9b9b',
  },
  {
    _id: '6f9a9b9b9b9b9b9b9b9b9b9b',
    emailaddress: 'JaneDoe@test.com',
    firstname: 'Jane',
    lastname: 'Doe',
    oid: '6f9a9b9b9b9b9b9b9b9b9b9b',
  },
];

/**
 * People mock query
 */
export default {
  type: new GraphQLList(PeopleType),
  args: {
    applications: { type: new GraphQLList(GraphQLID) },
  },
  resolve(parent, args, context) {
    try {
      // return a test user
      return MockedPeople;
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
