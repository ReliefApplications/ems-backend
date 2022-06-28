import { camelize, pluralize, singularize } from 'inflection';
import { NameExtension } from './getFieldName';

/**
 * Gets relationship name from a given key
 *
 * @param key Key
 * @returns Pluralized inflection of the key
 */
export const getRelationshipFromKey = (key) => pluralize(key);

/**
 * Gets the type name from a given key
 *
 * @param key Key
 * @param plural Boolean that indicates if key is plural
 * @returns Camelized inflection of the singular form of the key
 */
export const getTypeFromKey = (key, plural = false) =>
  camelize(plural ? key : singularize(key));

/**
 * Gets the meta name for a given key
 *
 * @param key Key
 * @returns The meta name for the key
 */
export const getMetaTypeFromKey = (key: string): string => `_${key}Meta`;

/**
 * Gets the related key name for a given field
 *
 * @param fieldName The related field name
 * @returns The related key name
 */
export const getRelatedKey = (fieldName) =>
  camelize(
    pluralize(
      fieldName.substr(
        0,
        fieldName.length - (fieldName.endsWith(NameExtension.resource) ? 3 : 4)
      )
    )
  );

/**
 * The reverse related key name for a given field
 *
 * @param key Key
 * @returns The singularized inflection of the with '_id' appened at the end
 */
export const getReverseRelatedField = (key: string) =>
  `${singularize(key)}${NameExtension.resource}`;

/**
 * Gets the related resource from a field
 *
 * @param fieldName The related field name
 * @param data The resource fields
 * @param typesById A object with ids as keys and resource names as values
 * @returns A resource name
 */
export const getRelatedType = (fieldName, data, typesById) => {
  const relations: any = Object.fromEntries(
    data.map((x) => [x.name, x.resource])
  );
  const id =
    relations[
      fieldName.substr(
        0,
        fieldName.length - (fieldName.endsWith(NameExtension.resource) ? 3 : 4)
      )
    ];

  return typesById[id];
};

/**
 * Gets the related type name for a field
 *
 * @param fieldName the name of the field
 * @returns The type name
 */
export const getRelatedTypeName = (fieldName) =>
  getTypeFromKey(
    fieldName.substr(
      0,
      fieldName.length - (fieldName.endsWith(NameExtension.resource) ? 3 : 4)
    ),
    fieldName.endsWith(NameExtension.referenceData)
  );
