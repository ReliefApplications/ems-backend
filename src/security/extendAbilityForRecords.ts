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
} from './defineUserAbility';
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
  // check if the form of the record is correct, for populated form or id form
  return {
    $and: [
      { $or: [{ 'form._id': form._id }, { form: form._id }] },
      { $or: permissionFilters },
    ],
  };
}

/**
 * Extends the user abilities for records with permission of a form
 *
 * @param user user to get ability of
 * @param form The form inside we want to know the permissions
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
export default function extendAbilityForRecords(
  user: User,
  form: Form,
  ability?: AppAbility
): AppAbility {
  if (ability === undefined) ability = user.ability;

  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;
  const cannot = abilityBuilder.cannot;

  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  // create a new record
  if (
    ability.cannot('create', 'Record') &&
    userHasRoleFor('canCreateRecords', user, form)
  ) {
    // warning: the filter on the form is not used if we call can('create', 'Record')
    // instead of can('create', record) with an already existing record instance
    can('create', 'Record', {
      $or: [{ 'form._id': form._id }, { form: form._id }],
    } as MongoQuery);
  }

  // access a record
  if (
    ability.cannot('read', 'Record') &&
    userHasRoleFor('canSeeRecords', user, form)
  ) {
    can('read', 'Record', formFilters('canSeeRecords', user, form));
    // exception: user cannot read archived records if he cannot update the form
    if (ability.cannot('update', form)) {
      cannot('read', 'Record', { archived: true });
    }
  }

  // update a record
  if (
    ability.cannot('update', 'Record') &&
    userHasRoleFor('canUpdateRecords', user, form)
  ) {
    can('update', 'Record', formFilters('canUpdateRecords', user, form));
  }

  // delete a record
  if (
    ability.cannot('delete', 'Record') &&
    userHasRoleFor('canDeleteRecords', user, form)
  ) {
    can('delete', 'Record', formFilters('canDeleteRecords', user, form));
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}
