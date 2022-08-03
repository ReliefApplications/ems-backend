import {
  AbilityBuilder,
  Ability,
  AbilityClass,
  MongoQuery,
} from '@casl/ability';
import { clone } from 'lodash';
import {
  AppAbility,
  ObjectPermissions,
  conditionsMatcher,
} from './defineUserAbilities';
import { getFormPermissionFilter } from '../utils/filter';
import { Form, Role, User } from '../models';

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
function userHasRoleFor(type: ObjectPermissions, user: User, form: Form) {
  return user.roles?.some((role: Role) =>
    form.permissions[type]?.map((x) => (x.role ? x.role : x)).includes(role._id)
  );
}

/**
 * A function to get and format the permission filter on records,
 * and add a filter to check the record is linked to the given form
 *
 * @param type The type of the record permission
 * @param user The user instance
 * @param form The form instance
 * @returns A boolean indicating if the user has the permission
 */
function formFilters(
  type: ObjectPermissions,
  user: User,
  form: Form
): MongoQuery {
  const permissionFilters = getFormPermissionFilter(user, form, type);
  return {
    $and: [{ 'form._id': form._id }, { $or: permissionFilters }],
  };
}

/**
 * Defines abilities for the given user, inside the permission space of a form.
 *
 * @param user user to get ability of
 * @param form The form inside we want to know the permissions
 * @returns ability definition of the user
 */
export default function defineUserAbilitiesOnForm(
  user: User,
  form: Form
): AppAbility {
  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;

  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(user.ability.rules);

  // add permissions for records specific to this form
  if (
    user.ability.cannot('create', 'Record') &&
    userHasRoleFor('canCreateRecords', user, form)
  ) {
    can('create', 'Record', { form: form.id });
  }
  if (
    user.ability.cannot('read', 'Record') &&
    userHasRoleFor('canSeeRecords', user, form)
  ) {
    can('read', 'Record', formFilters('canSeeRecords', user, form));
  }
  if (
    user.ability.cannot('update', 'Record') &&
    userHasRoleFor('canUpdateRecords', user, form)
  ) {
    can('update', 'Record', formFilters('canUpdateRecords', user, form));
  }
  if (
    user.ability.cannot('delete', 'Record') &&
    userHasRoleFor('canDeleteRecords', user, form)
  ) {
    can('delete', 'Record', formFilters('canDeleteRecords', user, form));
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}
