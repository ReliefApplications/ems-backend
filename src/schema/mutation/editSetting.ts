import { GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { SettingType } from '../types';
import { Setting } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { settingCache, SETTING_KEY } from '../../utils/user/userManagement';

/* Update settings if authorized. Update cached settings as well.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: SettingType,
  args: {
    userManagement: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    // Authorization check
    const ability: AppAbility = context.user.ability;
    if (ability.cannot('update', 'Setting'))
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    // Arguments check
    if (!args || !args.userManagement)
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditSettingArguments')
      );
    // Perform update on DB
    const update = {
      modifiedAt: new Date(),
    };
    Object.assign(
      update,
      args.userManagement && {
        userManagement: args.userManagement.local
          ? { local: true }
          : args.userManagement,
      }
    );
    const setting = await Setting.findOneAndUpdate({}, update, { new: true });
    // Update cached settings
    settingCache.set(SETTING_KEY, setting.toJSON());
    return setting;
  },
};
