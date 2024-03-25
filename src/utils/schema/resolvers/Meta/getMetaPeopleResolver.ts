import { Record } from '@models';
// import { getPeople } from '@utils/proxy';

/**
 * Return people meta resolver.
 *
 * @param field field definition.
 * @returns People resolver.
 */
const getMetaPeopleResolver = async (field: any) => {
  const records = await Record.find({ resource: field.resource });
  const peopleIds = [];
  records.forEach((record) => {
    const propertyValue = record.data[field.name];
    propertyValue.flat().forEach((id: string) => {
      if (!peopleIds.includes(id)) {
        peopleIds.push(id);
      }
    });
  });
  const getFilter = (people: any) => {
    const formattedFilter = `{
      OR: [
        {
          userid_eq:
          [${people.map((el: any) => `"${el}"`)}]
        }
      ]
    }`;
    return formattedFilter.replace(/\s/g, '');
  };
  const filter = getFilter(peopleIds);
  console.log(filter);

  // const people = await getPeople(token, filter);
  // return Object.assign(field, {
  //   choices: people.map((x: any) => {
  //     const fullname =
  //       x.firstname && x.lastname
  //         ? `${x.firstname}, ${x.lastname}`
  //         : x.firstname || x.lastname;
  //     return {
  //       text: `${fullname} (${x.emailaddress})`,
  //       value: x.id,
  //     };
  //   }),
  // });

  // Temporary solution as we don't have the token
  return Object.assign(field, {
    choices: peopleIds.map((x: any, id) => {
      return {
        text: 'User ' + id,
        value: x,
      };
    }),
  });
};

export default getMetaPeopleResolver;
