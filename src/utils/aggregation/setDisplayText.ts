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
  // Cache resolved related Resource documents within this call to avoid
  // repeated lookups when several mapped fields reference the same resource.
  const resourceCache = new Map<string, Resource>();
  const getRelatedResource = async (id: any): Promise<Resource> => {
    const key = String(id);
    if (resourceCache.has(key)) {
      return resourceCache.get(key);
    }
    const doc = await Resource.findById(id);
    resourceCache.set(key, doc);
    return doc;
  };

  // Resolve fields with choices in parallel
  const resolved = await Promise.all(
    mappedFields.map(async (x) => {
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
          const related = await getRelatedResource(formResource.resource);
          lookAt = related?.fields ?? [];
          lookFor = question;
        }
      }
      // then, search for related field
      const formField = lookAt.find((field: any) => {
        return (
          lookFor === field.name &&
          (field.choices || field.choicesByUrl || field.choicesByGraphQL)
        );
      });
      return formField ? { key: x.key, field: formField } : null;
    })
  );
  const fieldWithChoices: Record<string, any> = {};
  for (const entry of resolved) {
    if (entry) {
      fieldWithChoices[entry.key] = entry.field;
    }
  }
  for (const [key, field] of Object.entries(fieldWithChoices)) {
    // Fetch choices from source ( static / rest / graphql )
    const choices = await getFullChoices(field, context);
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
