import { GraphQLError, GraphQLList } from 'graphql';
import { logger } from '@services/logger.service';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { PersonType } from '@schema/types/person.type';
import { getPeople } from '@utils/proxy';

/** Arguments for the people query */
type PeopleArgs = {
  filter?: any;
};

/**
 * Get people.
 */
export default {
  type: new GraphQLList(PersonType),
  args: {
    filter: { type: GraphQLJSON },
  },
  async resolve(parent, args: PeopleArgs, context: Context) {
    try {
      const myFilter = `{
        OR: [
          { firstname_like: "%${args.filter.value}%" }
          { lastname_like: "%${args.filter.value}%" }
          { emailaddress_like: "%${args.filter.value}%" }
        ]
      }`;

      const people = await getPeople(context.token, myFilter);
      if (people) {
        return people.map((person) => {
          const updatedPerson = { ...person };
          updatedPerson.id = updatedPerson.userid;
          delete updatedPerson.userid;
          return updatedPerson;
        });
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
