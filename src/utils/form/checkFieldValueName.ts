import { GraphQLError } from 'graphql/error';
import i18next from 'i18next';

/** The default fields */
const DEFAULT_FIELDS = [
  'id',
  'incrementalId',
  'createdAt',
  'modifiedAt',
  'form',
  'createdBy',
  'createdBy.id',
  'createdBy.name',
  'createdBy.username',
  'lastUpdatedBy',
  'lastUpdatedBy.id',
  'lastUpdatedBy.name',
  'lastUpdatedBy.username',
];

/**
 * Checks field value name same as default field name in form.
 * Throw error if name exists in default field name.
 *
 * @param structure form structure.
 */
export const checkFieldValueName = (structure): void => {
  structure.pages.map(function (items) {
    items.elements.map(function (result) {
      if (DEFAULT_FIELDS.includes(result.valueName)) {
        throw new GraphQLError(
          i18next.t(
            'mutations.form.edit.errors.fieldValueNameSameAsDefaultFieldName',
            {
              name: result.valueName,
            }
          )
        );
      }
    });
  });
};
