import { Field } from './getFieldType';

/** Enum of possible field name extensions, making link between datasources */
// eslint-disable-next-line @typescript-eslint/naming-convention
export enum NameExtension {
  resource = '_id',
  resources = '_ids',
  referenceData = '_ref',
}

/**
 * Get GraphQL name from field definition.
 *
 * @param field field definition.
 * @returns GraphQL name.
 */
const getFieldName = (field: Field): string => {
  const name = field.name.trim().split('-').join('_');
  if (field.resource) {
    return field.type === 'resources'
      ? `${name}${NameExtension.resources}`
      : `${name}${NameExtension.resource}`;
  }
  if (field.referenceData) {
    return `${name}${NameExtension.referenceData}`;
  }
  return name;
};

export default getFieldName;
