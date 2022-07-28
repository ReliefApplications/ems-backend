import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLString,
} from 'graphql';
import { HistoryVersionType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import { RecordHistory } from '../../utils/history';
import { Record, Form } from '../../models';

/**
 * Gets the record history for a record.
 * If user not connected or does not have permission, throw error.
 */
export default {
  type: GraphQLList(HistoryVersionType),
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
        translate: context.i18next.i18n.t,
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
