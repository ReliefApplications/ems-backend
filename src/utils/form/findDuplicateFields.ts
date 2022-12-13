import { GraphQLError } from 'graphql/error';
import i18next from 'i18next';

/**
 * Checks duplication of name in fields array.
 * Throw duplication error if duplication exists.
 *
 * @param fields Question fields array
 */
export const findDuplicateFields = (fields): void => {
  const names = fields.map((x) => x.name);
  const duplication = names.filter(
    (item, index) => names.indexOf(item) !== index
  );
  if (duplication.length > 0) {
    throw new GraphQLError(
      i18next.t('utils.form.findDuplicateFields.errors.dataFieldDuplicated', {
        name: duplication[0],
      })
    );
  }
};
