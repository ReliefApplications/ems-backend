import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';
import { Client, Form, Role, User } from '../models';
import { AppAbility, ObjectPermissions } from './defineUserAbilities';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Check if a user has a role with a permission on this form
 *
 * @param type The type of the permission
 * @param user The user instance
 * @param form The form instance
 * @returns A boolean indicating if the user has the permission
 */
function userCan(type: ObjectPermissions, user: User | Client, form: Form) {
  return user.roles.some((role: Role) =>
    form.permissions[type].includes(role._id)
  );
}

/**
 * Defines abilities for the given user, inside the permission space of a form.
 *
 * @param user user to get ability of
 * @param form The form inside we want to know the permissions
 * @returns ability definition of the user
 */
export default function defineUserAbilitiesOnForm(
  user: User | Client,
  form: Form
): AppAbility {
  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;

  // copy the existing global abilities from the user
  abilityBuilder.rules = new appAbility(user.ability.rules).rules;

  // add permissions for records specific to this form
  if (
    user.ability.cannot('create', 'Record') &&
    userCan('canCreateRecords', user, form)
  ) {
    can('create', 'Record');
  }
  if (
    user.ability.cannot('read', 'Record') &&
    userCan('canSeeRecords', user, form)
  ) {
    can('read', 'Record');
  }
  if (
    user.ability.cannot('update', 'Record') &&
    userCan('canUpdateRecords', user, form)
  ) {
    can('update', 'Record');
  }
  if (
    user.ability.cannot('delete', 'Record') &&
    userCan('canDeleteRecords', user, form)
  ) {
    can('delete', 'Record');
  }
  return abilityBuilder.build();
}
