import { Resource } from '@models';
import { getFullChoices, getText } from '@utils/form/getDisplayText';
import { get, isArray, set } from 'lodash';

/**
 * Take mappedFields and items and replace value by display text in items where it's needed.
 *
 * @param mappedFields mappedFields to know which field to update in the items.
 * @param items items list to update.
 * @param resource corresponding resource to retrieve fields definition.
 * @param context graphQL context.
 */
const setDisplayText = async (
  mappedFields: { key: string; value: string }[],
  items: { [key: string]: any }[],
  resource: Resource,
  context: any
): Promise<void> => {
  // Reducer to fetch fields with choices
  const reducer = async (acc, x) => {
    let lookAt = resource.fields;
    let lookFor = x.value;
    const [questionResource, question] = x.value.split('.');

    // in case it's a resource.s type question, search for the related resource
    if (questionResource && question) {
      const formResource = resource.fields.find(
        (field: any) =>
          questionResource === field.name &&
          ['resource', 'resources'].includes(field.type)
      );
      if (formResource) {
        lookAt = (await Resource.findById(formResource.resource)).fields;
        lookFor = question;
      }
    }
    // then, search for related field
    const formField = lookAt.find((field: any) => {
      return (
        lookFor === field.name &&
        (field.choices ||
          field.choicesByUrl ||
          field.choicesByGraphQL ||
          ['people', 'singlepeople'].includes(field.type))
      );
    });
    if (formField) {
      return { ...(await acc), [x.key]: formField };
    } else {
      return { ...(await acc) };
    }
  };
  const fieldWithChoices: any = await mappedFields.reduce(reducer, {});
  for (const [key, field] of Object.entries<any>(fieldWithChoices)) {
    // Fetch choices from source ( static / rest / graphql )
    let peopleIds = [];
    if (['people', 'singlepeople'].includes(field.type)) {
      peopleIds = items.map((item) => item[key]);
    }
    const choices = await getFullChoices(field, context, peopleIds);
    for (const item of items) {
      const fieldValue = get(item, key, null);
      if (fieldValue) {
        if (choices.length) {
          // Replace value by text, from list of choices
          set(
            item,
            key,
            isArray(fieldValue)
              ? fieldValue.map((x) => getText(choices, x))
              : getText(choices, fieldValue)
          );
        }
      } else {
        if (key === 'field' && fieldValue) {
          set(item, key, Number(fieldValue));
        }
      }
    }
  }
  // For each entry, make sure the field is a number
  for (const item of items) {
    const fieldValue = get(item, 'field', null);
    if (fieldValue) {
      set(item, 'field', Number(fieldValue));
    }
  }
};

export default setDisplayText;
