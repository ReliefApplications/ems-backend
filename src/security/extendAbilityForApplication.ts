import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import { User } from '@models';
import { AppAbility } from './defineUserAbility';
import permissions from '@const/permissions';

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
      r.permissions?.some((p) => p.type === permissions.canManageTemplates)
  );

  if (canManageAppTemplates)
    can(['create', 'delete', 'manage', 'read', 'update'], 'Template');

  const canManageDistributionLists = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some(
        (p) => p.type === permissions.canManageDistributionLists
      )
  );

  if (canManageDistributionLists)
    can(['create', 'delete', 'manage', 'read', 'update'], 'DistributionList');

  // Deprecated
  const canManageCustomNotification = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some(
        (p) => p.type === permissions.canManageCustomNotifications
      )
  );

  if (canManageCustomNotification)
    can(['create', 'delete', 'manage', 'read', 'update'], 'CustomNotification');

  const canSeeEmailNotifications = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some(
        (p) => p.type === permissions.canSeeEmailNotifications
      )
  );

  if (canSeeEmailNotifications) can('read', 'EmailNotification');

  const canUpdateEmailNotifications = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some(
        (p) => p.type === permissions.canUpdateEmailNotifications
      )
  );

  if (canUpdateEmailNotifications)
    can(['delete', 'update'], 'EmailNotification');

  const canCreateEmailNotifications = user.roles?.some(
    (r) =>
      r.application?.equals(application) &&
      r.permissions?.some(
        (p) => p.type === permissions.canCreateEmailNotifications
      )
  );

  if (canCreateEmailNotifications) can('create', 'EmailNotification');

  return abilityBuilder.build();
}
