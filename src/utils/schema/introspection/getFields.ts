import { GraphQLBoolean } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  defaultMetaFields,
  defaultRecordFields,
} from '@const/defaultRecordFields';
import getFieldName from './getFieldName';
import getTypeFromField from './getFieldType';

/**
 * Gets the meta fields for documents with many to one relashionships
 *
 * @param fields The fields
 * @returns Object with the name keys and field values
 */
export const getManyToOneMetaFields = (fields) => {
  const manyToOneFields = {};
  for (const field of fields.filter((x) => x.resource && x.relatedName)) {
    manyToOneFields[getFieldName(field)] = field;
  }
  return manyToOneFields;
};

/**
 * Get meta types from fields.
 *
 * @param fields definition of structure fields.
 * @returns GraphQL meta types of the fields.
 */
export const getMetaFields = (fields: any) => {
  let glFields = Object.fromEntries(
    fields
      .filter((x) => x.name)
      .map((x) => [
        getFieldName(x),
        {
          type: GraphQLJSON,
        },
      ])
  );
  for (const element of defaultMetaFields) {
    glFields = { ...glFields, [element.field]: { type: element.type } };
  }
  return glFields;
};

/**
 * Get types from fields.
 *
 * @param fields definition of structure fields.
 * @returns GraphQL types of the fields.
 */
export const getFields = (fields: any) => {
  let glFields = Object.fromEntries(
    fields
      .filter((x) => x.name)
      .map((x) => [
        getFieldName(x),
        {
          type: getTypeFromField(x, true),
          ...((x.choices || x.choicesByUrl) && {
            args: { display: { type: GraphQLBoolean } },
          }),
        },
      ])
  );
  for (const element of defaultRecordFields) {
    glFields = {
      ...glFields,
      [element.field]: {
        type: element.type,
        ...(element.args && { args: element.args }),
      },
    };
  }
  return glFields;
};

/**
 * Get filter types from fields.
 *
 * @param fields definition of structure fields.
 * @returns GraphQL filter types of the fields.
 */
export const getFilterFields = (fields: any) => {
  let glFields = Object.fromEntries(
    fields
      .filter((x) => x.name)
      .map((x) => [
        getFieldName(x),
        {
          type: getTypeFromField(x, true),
        },
      ])
  );
  for (const element of defaultRecordFields) {
    glFields = { ...glFields, [element.field]: { type: element.filterType } };
  }
  return glFields;
};
