import { defaultRecordFieldsFlat } from '@const/defaultRecordFields';
import { GraphQLError } from 'graphql';
import i18next from 'i18next';

/**
 * Check if any default field is used
 *
 * @param fields list of fields
 */
export const checkDefaultFields = (fields: any[]): void => {
  const defaultFields = defaultRecordFieldsFlat;
  for (const field of fields) {
    if (defaultFields.includes(field.name)) {
      throw new GraphQLError(
        i18next.t('mutations.form.edit.errors.defaultFieldDuplicated', {
          name: field.name,
        })
      );
    }
  }
};

export default checkDefaultFields;
