import { GraphQLError, GraphQLInt, GraphQLList } from 'graphql';
import { logger } from '@services/logger.service';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { PersonType } from '@schema/types/person.type';
import { getPeople } from '@utils/proxy';

/** Arguments for the people query */
type PeopleArgs = {
  filter?: any;
  offset?: number;
};

/**
 * Return distant users from common services
 */
export default {
  type: new GraphQLList(PersonType),
  args: {
    filter: { type: GraphQLJSON },
    offset: { type: GraphQLInt },
  },
  async resolve(parent, args: PeopleArgs, context: Context) {
    if (!args.filter) return [];
    try {
      // Formatted filter used by the API
      const getFormattedFilter = (filter: any) => {
        const formattedFilter = `{${filter.logic.toUpperCase()}:[
            ${filter.filters.map((el: any) => {
              if (el.operator === 'like') {
                el.value = `"%${el.value}%"`;
              } else if (el.operator === 'in') {
                el.value = el.value.map((e) => `"${e}"`);
                el.value = `[${el.value}]`;
              }
              return `{ ${el.field}_${el.operator}: ${el.value} }`;
            })}
          ]
        }`;
        return formattedFilter.replace(/\s/g, '');
      };
      const filter = getFormattedFilter(args.filter);
      const people = await getPeople(context.token, filter, args.offset ?? 0);
      if (people) {
        return people.map((person) => {
          const updatedPerson = { ...person };
          updatedPerson.id = updatedPerson.userid;
          delete updatedPerson.userid;
          return updatedPerson;
        });
      }
      return [];
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
