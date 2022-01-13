/**
 * Return checkbox meta resolver.
 *
 * @param field field definition.
 * @returns Checkbox resolver.
 */
const getMetaCheckboxResolver = (field: any) => {
  if (field.choices) {
    const choices = field.choices.map((x) => {
      return {
        text: x.text ? x.text : x,
        value: x.value ? x.value : x,
      };
    });
    return Object.assign(field, { choices });
  } else {
    return field;
  }
};

export default getMetaCheckboxResolver;
