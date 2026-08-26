import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLString,
  GraphQLInt,
} from 'graphql';
import { GraphQLDateTime } from 'graphql-scalars';
import { HistoryVersionType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { RecordHistory } from '@utils/history';
import { Form, Record } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';
import checkPageSize from '@utils/schema/errors/checkPageSize.util';
import { getDraftRecordFilter } from '@utils/filter';

/** Arguments for the recordHistory query */
type RecordHistoryArgs = {
  id: string | Types.ObjectId;
  lang?: string;
  first?: number;
  skip?: number;
  fields?: string[];
  fromDate?: Date;
  toDate?: Date;
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
    first: { type: GraphQLInt },
    skip: { type: GraphQLInt },
    fields: { type: new GraphQLList(GraphQLString) },
    fromDate: { type: GraphQLDateTime },
    toDate: { type: GraphQLDateTime },
  },
  async resolve(parent, args: RecordHistoryArgs, context: Context) {
    graphQLAuthCheck(context);
    // Make sure that the page size is not too important
    if (args.first) {
      checkPageSize(args.first);
    }
    try {
      // Setting language, if provided
      if (args.lang) {
        await context.i18next.i18n.changeLanguage(args.lang);
      }

      const user = context.user;
      // Get data. Versions are fetched lazily by RecordHistory, only for the
      // requested page, instead of being populated in full here.
      const record: Record = await Record.findOne({
        _id: args.id,
        ...getDraftRecordFilter(),
      }).populate({
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
      }).getHistory({
        skip: args.skip,
        limit: args.first,
        fields: args.fields,
        fromDate: args.fromDate,
        toDate: args.toDate,
      });
      for (const version of history) {
        for (const change of version.changes) {
          if (change.new) change.new = JSON.stringify(change.new);
          if (change.old) change.old = JSON.stringify(change.old);
        }
      }
      return history;
    } catch (err) {
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
