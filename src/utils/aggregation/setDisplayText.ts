import { Resource } from '@models';
import getDisplayText from '@utils/form/getDisplayText';
import { get, set } from 'lodash';

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
      return lookFor === field.name && (field.choices || field.choicesByUrl);
    });
    if (formField) {
      return { ...(await acc), [x.key]: formField };
    } else {
      return { ...(await acc) };
    }
  };
  const fieldWithChoices = await mappedFields.reduce(reducer, {});
  for (const [key, field] of Object.entries(fieldWithChoices)) {
    for (const item of items) {
      const fieldValue = get(item, key, null);
      if (fieldValue) {
        const displayText = await getDisplayText(field, fieldValue, context);
        if (displayText) {
          set(item, key, displayText);
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
