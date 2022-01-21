/**
 * Return tagbox meta resolver.
 *
 * @param field field definition.
 * @returns Tagbox resolver.
 */
const getMetaTagboxResolver = (field: any) => {
  return Object.assign(field, {
    ...(field.choices && {
      choices: field.choices.map((x) => {
        return {
          text: x.text ? x.text : x,
          value: x.value ? x.value : x,
        };
      }),
    }),
  });
};

export default getMetaTagboxResolver;
