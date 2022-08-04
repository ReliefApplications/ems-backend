import { GraphQLError } from 'graphql';
import { SettingType } from '../types';
import { Setting } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';

export default {
  /*  Returns page from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
  type: SettingType,
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    // Authorization check
    const ability: AppAbility = context.user.ability;
    if (ability.cannot('read', 'Setting'))
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    // Perform query
    const setting = await Setting.findOne();
    if (setting) {
      return setting;
    }
    throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
  },
};
