import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLString,
  GraphQLObjectType,
} from 'graphql';
import { AppAbility } from '../../security/defineAbilityFor';
import { RecordHistory } from '../../utils/history';
import { Record, Form } from '../../models';
import { GraphQLDateTime } from 'graphql-iso-date';
import { VersionType } from '../../schema/types';

/**
 * GraphQL Object Type of Single history change.
 */
const changeType = new GraphQLObjectType({
  name: 'Change',
  fields: () => ({
    type: { type: GraphQLString },
    displayType: { type: GraphQLString },
    field: { type: GraphQLString },
    displayName: { type: GraphQLString },
    old: { type: GraphQLString },
    new: { type: GraphQLString },
  }),
});

/**
 * GraphQL Object Type of History entry.
 */
const historyVersionType = new GraphQLObjectType({
  name: 'HistoryVersion',
  fields: () => ({
    createdAt: { type: GraphQLDateTime },
    createdBy: { type: GraphQLString },
    changes: { type: GraphQLList(changeType) },
    version: { type: VersionType },
  }),
});

/**
 * Gets the record history for a record.
 * If user not connected or does not have permission, throw error.
 */
export default {
  type: GraphQLList(historyVersionType),
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    lang: { type: GraphQLString },
  },
  async resolve(parent, args, context) {
    // Setting language, if provided
    if (args.lang) {
      await context.i18next.i18n.changeLanguage(args.lang);
    }

    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.i18n.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    const recordFilters = Record.accessibleBy(ability, 'read')
      .where({ _id: args.id, archived: { $ne: true } })
      .getFilter();
    const record: Record = await Record.findOne(recordFilters)
      .populate({
        path: 'versions',
        populate: {
          path: 'createdBy',
          model: 'User',
        },
      })
      .populate({
        path: 'createdBy.user',
        model: 'User',
      });
    const formFilters = Form.accessibleBy(ability, 'read')
      .where({ _id: record.form })
      .getFilter();
    const form = await Form.findOne(formFilters).populate({
      path: 'resource',
      model: 'Resource',
    });
    if (form) {
      record.form = form;

      const history = await new RecordHistory(record, {
        ability,
      }).getHistory();

      for (const version of history) {
        for (const change of version.changes) {
          if (change.new) change.new = JSON.stringify(change.new);
          if (change.old) change.old = JSON.stringify(change.old);
        }
      }
      return history;
    }

    // !form
    throw new GraphQLError(
      context.i18next.i18n.t('errors.permissionNotGranted')
    );
  },
};
