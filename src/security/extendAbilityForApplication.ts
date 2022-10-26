import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import { User, Application } from '../models';
import { AppAbility } from './defineAbilityFor';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Extends the user abilities for applications
 *
 * @param user user to extend abilities for
 * @param application The form or resource to get the records from
 * @param ability An ability instance (optional - by default user.ability)
 * @returns The extended ability object
 */
export default async function extendAbilityForApplications(
  user: User,
  application: Application | string,
  ability: AppAbility = user.ability
): Promise<AppAbility> {
  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;

  const app =
    typeof application === 'string'
      ? await Application.findById(application)
      : application;

  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  // add the application specific abilities
  const canManageAppTemplates = user.roles?.some(
    (r) =>
      r.application?.equals(app._id) &&
      r.permissions?.some((p) => p.type === 'can_manage_templates')
  );

  if (canManageAppTemplates)
    can(['create', 'delete', 'manage', 'read', 'update'], 'Template');

  return abilityBuilder.build();
}
