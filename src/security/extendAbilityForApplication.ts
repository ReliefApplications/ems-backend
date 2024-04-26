import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import { User } from '@models';
import { AppAbility } from './defineUserAbility';

/** Application ability class */
// eslint-disable-next-line deprecation/deprecation
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

  const canSeeEmailNotifications = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some((p) => p.type === 'can_see_email_notifications')
  );

  if (canSeeEmailNotifications) can('read', 'EmailNotification');

  const canManageEmailNotifications = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some((p) => p.type === 'can_manage_email_notifications')
  );

  if (canManageEmailNotifications)
    can(['delete', 'update'], 'EmailNotification');

  const canCreateEmailNotifications = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some((p) => p.type === 'can_create_email_notifications')
  );

  if (canCreateEmailNotifications) can('create', 'EmailNotification');

  return abilityBuilder.build();
}
