import { camelize, pluralize, singularize } from 'inflection';
import { NameExtension } from './getFieldName';

export const getRelationshipFromKey = (key) => pluralize(key);

export const getTypeFromKey = (key, plural = false) =>
  camelize(plural ? key : singularize(key));

export const getMetaTypeFromKey = (key: string): string => `_${key}Meta`;

export const getRelatedKey = (fieldName) =>
  camelize(
    pluralize(
      fieldName.substr(
        0,
        fieldName.length - (fieldName.endsWith(NameExtension.resource) ? 3 : 4)
      )
    )
  );

export const getReverseRelatedField = (key) =>
  `${singularize(key)}${NameExtension.resource}`;

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

export const getRelatedTypeName = (fieldName) =>
  getTypeFromKey(
    fieldName.substr(
      0,
      fieldName.length - (fieldName.endsWith(NameExtension.resource) ? 3 : 4)
    ),
    fieldName.endsWith(NameExtension.referenceData)
  );
