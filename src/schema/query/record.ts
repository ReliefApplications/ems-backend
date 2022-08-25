import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Form, Record } from '../../models';
import { RecordType } from '../types';
import extendAbilityForRecords from '../../security/extendAbilityForRecords';
import { pick } from 'lodash';

/**
 * Return record from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    // Get the form and the record
    const record = await Record.findById(args.id);
    const form = await Form.findById(record.form);

    // Check ability
    const ability = await extendAbilityForRecords(user, form);
    if (ability.cannot('read', record)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    // Return the record
    return pick(record, record.accessibleFieldsBy(ability));
  },
};
