import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLString,
} from 'graphql';
import { HistoryVersionType } from '../types';
import { AppAbility } from '../../security/defineUserAbilities';
import defineUserAbilitiesOnForm from '../../security/defineUserAbilitiesOnForm';
import { RecordHistory } from '../../utils/history';
import { Record } from '../../models';

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

    // Get data
    const record: Record = await Record.findById(args.id)
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
      })
      .populate({
        path: 'form',
        model: 'Form',
        populate: {
          path: 'resource',
          model: 'Resource',
        },
      });

    // Check ability
    const ability: AppAbility = defineUserAbilitiesOnForm(user, record.form);
    if (ability.cannot('read', record) || ability.cannot('read', record.form)) {
      throw new GraphQLError(
        context.i18next.i18n.t('errors.permissionNotGranted')
      );
    }

    // Create the history and return it
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
  },
};
