import { GraphQLError } from 'graphql';
import { Form, Record } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import { Context } from '@server/apollo/context';

/** Arguments of the single entity query */
type SingleArgs = {
  id: string;
  display?: boolean;
  data?: any;
};

/**
 * Returns a resolver that fetches a record by id, if the user is logged
 * and allowed to read it. Mirrors the `record` query: the user ability is
 * extended with the record form permissions, read access is checked on the
 * record itself and only the fields the user can read are returned.
 *
 * @returns A resolver function that fetches a record by id
 */
export default () =>
  async (_, { id, data }: SingleArgs, context: Context) => {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const record = await Record.findOne({ _id: id, archived: { $ne: true } });
      if (!record) {
        return null;
      }
      const form = await Form.findById(record.form);

      // Check ability
      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('read', record)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      if (data) {
        record.data = data;
      }
      // Return the record, keeping only the fields the user can read
      return getAccessibleFields(record, ability);
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  };
