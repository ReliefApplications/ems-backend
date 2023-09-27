import { MockedPeople } from '@schema/query/people.query';

/**
 * Return people meta resolver.
 *
 * @param field field definition.
 * @returns people resolver.
 */
const getMetaUsersResolver = async (field: any) => {
  const people = MockedPeople;
  return Object.assign(field, {
    choices: people
      ? people.map((x) => {
          return {
            text: x.username,
            value: x._id,
          };
        })
      : [],
  });
};

export default getMetaUsersResolver;
