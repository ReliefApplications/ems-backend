import {
  GraphQLNonNull,
  GraphQLError,
  GraphQLString,
  GraphQLID,
} from 'graphql';
import { Form, Record } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { AppAbility } from '@security/defineUserAbility';
import { subject } from '@casl/ability';
import GraphQLJSON from 'graphql-type-json';

/**
 * Filters data from a record according to the user's ability
 * keeps only fields the user has access to
 *
 * @param record Record to filter data from
 * @param ability User ability object
 * @param field field to get data from
 * @param context Apollo context
 * @returns Record with only accessible data
 */
const getFieldValueFromRecord = (
  record: Record,
  ability: AppAbility,
  field: string,
  context: Context
) => {
  if (ability.cannot('read', subject('Record', record), `data.${field}`)) {
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  }
  return record.data[field];
};

/**
 * Filters data from a (list of) record(s) according to the user's ability
 * keeps only fields the user has access to
 *
 * @param element Record/Records to filter data from
 * @param ability User ability object
 * @param field field to test
 * @param context Apollo context
 * @returns Record/Records with only accessible data
 */
export function getFieldValue(
  element: Record | Record[],
  ability: AppAbility,
  field: string,
  context: Context
) {
  return Array.isArray(element)
    ? element.map((r) => getFieldValueFromRecord(r, ability, field, context))
    : getFieldValueFromRecord(element, ability, field, context);
}

/**
 * Return record from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: GraphQLJSON,
  args: {
    form: { type: new GraphQLNonNull(GraphQLID) },
    field: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Get the form and the record
      const records = await Record.where({ form: args.form });
      const form = await Form.findById(args.form);
      const field = form.fields.find((f) => f.name === args.field);

      // Check ability
      const ability = await extendAbilityForRecords(user, form);

      // Return the record
      const valuesForField = getFieldValue(
        records,
        ability,
        field.name,
        context
      );

      console.log('field type', field.type);
      switch (field.type) {
        case 'numeric':
          return {
            details: [Math.min(...valuesForField), Math.max(...valuesForField)],
          };
        case 'time':
        case 'date':
          return {
            details: [
              new Date(Math.min(...valuesForField)),
              new Date(Math.max(...valuesForField)),
            ],
          };
        case 'text':
          return { details: valuesForField };
        default:
          return new GraphQLError('unsupported type');
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
