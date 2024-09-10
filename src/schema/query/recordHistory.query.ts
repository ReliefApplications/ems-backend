import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLString,
} from 'graphql';
import { HistoryVersionType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { RecordHistory } from '@utils/history';
import { Form, Record } from '@models';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the recordHistory query */
type RecordHistoryArgs = {
  id: string | Types.ObjectId;
  lang?: string;
};

/**
 * Gets the record history for a record.
 * If user not connected or does not have permission, throw error.
 */
export default {
  type: new GraphQLList(HistoryVersionType),
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    lang: { type: GraphQLString },
  },
  async resolve(parent, args: RecordHistoryArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      // Setting language, if provided
      if (args.lang) {
        await context.i18next.i18n.changeLanguage(args.lang);
      }

      const user = context.user;
      // Get data
      const record: Record = await Record.findById(args.id)
        .populate({
          path: 'versions',
          model: 'Version',
          populate: {
            path: 'createdBy',
            model: 'User',
          },
        })
        .populate({
          path: 'resource',
          model: 'Resource',
        });
      if (!record) {
        throw new GraphQLError(
          context.i18next.i18n.t('common.errors.permissionNotGranted')
        );
      }
      const form = await Form.findById(record.form);
      if (!form) {
        throw new GraphQLError(
          context.i18next.i18n.t('common.errors.permissionNotGranted')
        );
      }

      // Check ability
      const ability = await extendAbilityForRecords(user);
      if (ability.cannot('read', record) || ability.cannot('read', form)) {
        throw new GraphQLError(
          context.i18next.i18n.t('common.errors.permissionNotGranted')
        );
      }

      // Create the history and return it
      record.form = form;
      const history = await new RecordHistory(record, {
        translate: context.i18next.i18n.t,
        ability,
        context,
      }).getHistory();
      for (const version of history) {
        for (const change of version.changes) {
          if (change.new) change.new = JSON.stringify(change.new);
          if (change.old) change.old = JSON.stringify(change.old);
        }
      }
      return history;
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
