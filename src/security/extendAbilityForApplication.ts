import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import { User } from '@models';
import { AppAbility } from './defineUserAbility';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Extends the user abilities for applications
 *
 * @param user user to extend abilities for
 * @param application The application to extend abilities for
 * @param ability An ability instance (optional - by default user.ability)
 * @returns The extended ability object
 */
export default function extendAbilityForApplications(
  user: User,
  application: string,
  ability: AppAbility = user.ability
): AppAbility {
  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;

  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  // add the application specific abilities
  const canManageAppTemplates = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some((p) => p.type === 'can_manage_templates')
  );

  if (canManageAppTemplates)
    can(['create', 'delete', 'manage', 'read', 'update'], 'Template');

  const canManageDistributionLists = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some((p) => p.type === 'can_manage_distribution_lists')
  );

  if (canManageDistributionLists)
    can(['create', 'delete', 'manage', 'read', 'update'], 'DistributionList');

  const canManageCustomNotification = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some((p) => p.type === 'can_manage_custom_notifications')
  );

  if (canManageCustomNotification)
    can(['create', 'delete', 'manage', 'read', 'update'], 'CustomNotification');

  return abilityBuilder.build();
}
