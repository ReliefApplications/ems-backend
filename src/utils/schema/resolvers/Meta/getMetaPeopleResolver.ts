import { Record } from '@models';
import { Context } from '@server/apollo/context';
import { getPeople } from '@utils/proxy';
import { isArray } from 'lodash';

/**
 * Return people meta resolver.
 *
 * @param field field definition.
 * @param context graphQL context.
 * @returns People resolver.
 */
const getMetaPeopleResolver = async (field: any, context: Context) => {
  // Optimize the query by only fetching target field
  const records = await Record.find(
    {
      resource: field.resource,
      archived: false,
    },
    { [`data.${field.name}`]: 1 }
  );
  const peopleIds = [];
  records.forEach((record) => {
    const propertyValue = record.data[field.name];
    if (isArray(propertyValue))
      propertyValue?.flat().forEach((id: string) => {
        if (!peopleIds.includes(id)) {
          peopleIds.push(id);
        }
      });
    else {
      peopleIds.push(propertyValue);
    }
  });
  // Generate a filter to only fetch users we need
  const getFilter = (people: any) => {
    const formattedFilter = `{
          userid_in:
          [${people.map((el: any) => `"${el}"`)}]
    }`;
    return formattedFilter.replace(/\s/g, '');
  };
  const filter = getFilter(peopleIds);
  const people = await getPeople(context.token, filter);
  if (!people) {
    return [];
  }

  delete field.resource;

  return Object.assign(field, {
    choices: people.map((x: any) => {
      const fullname =
        x.firstname && x.lastname
          ? `${x.firstname}, ${x.lastname}`
          : x.firstname || x.lastname;
      return {
        text: `${fullname} (${x.emailaddress})`,
        value: x.userid,
      };
    }),
  });
};

export default getMetaPeopleResolver;
