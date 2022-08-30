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
import { Form, Role, User, Resource } from '../models';
import { isValidObjectId } from 'mongoose';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Check if a user can see a certain field of a resource
 *
 * @param type The type of the permission
 * @param user The user instance
 * @param field The field to check (optional)
 * @returns A boolean indicating if the user has the permission
 */
function userFieldAccess(type: 'read' | 'update', user: User, field: any) {
  if (field === undefined) return false;
  const arrayToCheck = type === 'read' ? 'canSee' : 'canUpdate';

  // if the user has a role in the array, they should have the permission, return true
  // otherwise, return false
  return user.roles?.some((role: Role) =>
    field.permissions?.[arrayToCheck]?.some((perm) => perm._id.equals(role._id))
  );
}

/**
 * Check if a user has a role with a permission on this form
 *
 * @param type The type of the permission
 * @param user The user instance
 * @param resource The resource instance
 * @returns A boolean indicating if the user has the permission
 */
function userHasRoleFor(
  type: ObjectPermissions,
  user: User,
  resource: Resource
) {
  return user.roles?.some((role: Role) =>
    resource.permissions[type]
      ?.map((x) => (x.role ? x.role : x))
      .includes(role._id)
  );
}

/**
 * Extends the user abilities on field of a given resource
 *
 * @param user user to get ability of
 * @param resource Resource to get field permissions from
 * @param ability User ability (optional)
 * @returns ability object, including field permissions
 */
function defineResourceFieldsAbility(
  user: User,
  resource: Resource,
  ability?: AppAbility
  // isDebug?: boolean
): AppAbility {
  if (ability === undefined) ability = user.ability;
  if (resource.fields === undefined) return ability;

  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;
  const cannot = abilityBuilder.cannot;

  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  // by default, the user can't see any the fields
  cannot('read', 'Record', ['data']);
  cannot('update', 'Record', ['data']);

  const filter = {
    $or: [{ 'resource._id': resource._id }, { resource: resource._id }],
  } as MongoQuery;

  // for each field, check if the user has the permission to see it (both 'read' and 'update')
  resource.fields.forEach((field) => {
    if (userFieldAccess('read', user, field)) {
      can('read', 'Record', [`data.${field.name}`], filter);
      can('read', 'Form', [`field.${field.name}`], filter);
      can('read', 'Resource', [`field.${field.name}`], { _id: resource._id });
    } else {
      cannot('read', 'Record', [`data.${field.name}`], filter);
      cannot('read', 'Form', [`field.${field.name}`], filter);
      cannot('read', 'Resource', [`field.${field.name}`], {
        _id: resource._id,
      });
    }

    if (userFieldAccess('update', user, field)) {
      can('update', 'Record', [`data.${field.name}`], filter);
      can('update', 'Form', [`field.${field.name}`], filter);
      can('update', 'Resource', [`field.${field.name}`], { _id: resource._id });
    } else {
      cannot('update', 'Record', [`data.${field.name}`], filter);
      cannot('update', 'Form', [`field.${field.name}`], filter);
      cannot('update', 'Resource', [`field.${field.name}`], {
        _id: resource._id,
      });
    }
  });

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
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
function extendAbilityForRecordsOnForm(
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
    userHasRoleFor('canCreateRecords', user, form.resource)
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
    userHasRoleFor('canSeeRecords', user, form.resource)
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
    userHasRoleFor('canUpdateRecords', user, form.resource)
  ) {
    can('update', 'Record', formFilters('canUpdateRecords', user, form));
  }

  // delete a record
  if (
    ability.cannot('delete', 'Record') &&
    userHasRoleFor('canDeleteRecords', user, form.resource)
  ) {
    can('delete', 'Record', formFilters('canDeleteRecords', user, form));
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}

/**
 * Extends the user abilities on records for every forms of a resource
 *
 * @param user user to get ability of
 * @param resource The resource of which we want the forms
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
async function extendAbilityForRecordsOnResource(
  user: User,
  resource: Resource,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;
  const forms = await Form.find({ resource: resource._id }).select(
    '_id permissions fields'
  );
  for (const form of forms) {
    ability = await extendAbilityForRecordsOnForm(user, form, ability);
  }
  return ability;
}

/**
 * Extends the user abilities on records for every forms of a resource
 *
 * @param user user to get ability of
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
async function extendAbilityForRecordsOnAllForms(
  user: User,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;
  const forms = await Form.find().select('_id permissions fields');
  for (const form of forms) {
    ability = await extendAbilityForRecordsOnForm(user, form, ability);
  }
  return ability;
}

/**
 * Extends the user abilities for records permissions. Can be extended from
 * a single form, or from a resource, or from all forms.
 *
 * @param user The user instance
 * @param onObject The form or resource to get the records from
 * @param ability An ability instance (optional - by default user.ability)
 * @returns The extended ability object
 */
export default async function extendAbilityForRecords(
  user: User,
  onObject?: Resource | Form,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;

  if (onObject === undefined) {
    ability = await extendAbilityForRecordsOnAllForms(user, ability);
  }

  if (onObject instanceof Form) {
    ability = await extendAbilityForRecordsOnForm(
      user,
      onObject as Form,
      ability
    );
  } else if (onObject instanceof Resource) {
    ability = await extendAbilityForRecordsOnResource(user, onObject, ability);
  } else {
    throw new Error('Unexpected type');
  }
  const resource =
    onObject instanceof Resource
      ? (onObject as Resource)
      : isValidObjectId(onObject.resource)
      ? await Resource.findById(onObject.resource)
      : onObject.resource;

  if (!resource) return ability;

  return defineResourceFieldsAbility(user, resource, ability);
}
