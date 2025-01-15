import {
  AbilityBuilder,
  Ability,
  AbilityClass,
  MongoQuery,
} from '@casl/ability';
import { clone, get } from 'lodash';
import {
  AppAbility,
  ObjectPermissions,
  conditionsMatcher,
} from './defineUserAbility';
import { getFormPermissionFilter } from '@utils/filter';
import { Form, Role, User, Resource } from '@models';
import { Types } from 'mongoose';

/** Application ability class */
// eslint-disable-next-line deprecation/deprecation
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Check if a user can see a certain field of a resource
 *
 * @param type The type of the permission
 * @param user The user instance
 * @param field The field to check (optional)
 * @returns A boolean indicating if the user has the permission
 */
function userCanAccessField(
  type: 'read' | 'update',
  user: User,
  field: any
): boolean {
  if (field === undefined) return false;
  const arrayToCheck = type === 'read' ? 'canSee' : 'canUpdate';

  // if the user has a role in the array, they should have the permission, return true
  // otherwise, return false
  return user.roles?.some((role: Role) =>
    field.permissions?.[arrayToCheck]?.some((perm) =>
      typeof perm === 'string'
        ? new Types.ObjectId(perm).equals(role._id)
        : perm.equals(role._id)
    )
  );
}

/**
 * Populate the fields of resource question fields of a resource
 *
 * @param resource The resource to populate
 * @returns The resource with populated fields
 */
async function populateResourceFields(resource: Resource): Promise<Resource> {
  const newFields = [];

  for (const field of resource.fields) {
    if (field.type !== 'resource') {
      newFields.push(field);
      continue;
    }

    const res = await Resource.findById(field.resource);
    if (!res) {
      newFields.push(field);
      continue;
    }

    newFields.push({
      ...field,
      fields: res.fields,
    });
  }

  return {
    ...resource.toObject(),
    fields: newFields,
  } as Resource;
}

/**
 * Check if a user has a role with a permission on this form
 *
 * @param type The type of the permission
 * @param user The user instance
 * @param resource The resource instance
 * @returns A boolean indicating if the user has the permission
 */
export function userHasRoleFor(
  type: ObjectPermissions,
  user: User,
  resource: Resource
) {
  return user.roles?.some(
    (role: Role) =>
      !!resource.permissions[type]
        ?.map((x) => (x.role ? x.role : x))
        .find((r) => role._id.equals(r))
  );
}

/**
 * Get list of accessible fields for type
 *
 * @param type The type of the permission
 * @param user user to get ability of
 * @param resource Resource to get field permissions from
 * @returns list of accessible fields for type
 */
function getAccessibleFields(
  type: 'read' | 'update',
  user: User,
  resource: Resource
): string[] {
  const fields: string[] = [];

  // for each field, check if the user has the permission to see it (both 'read' and 'update')
  get(resource, 'fields', []).forEach((field) => {
    if (userCanAccessField(type, user, field)) {
      fields.push(`data.${field.name}`);
    }
  });

  return fields;
}

/**
 * A function to get and format the permission filter on records,
 * and add a filter to check the record is linked to the given form
 *
 * @param type The type of the record permission
 * @param user The user instance
 * @param resource The resource instance
 * @returns A boolean indicating if the user has the permission
 */
function formFilters(
  type: ObjectPermissions,
  user: User,
  resource: Resource
): MongoQuery {
  const permissionFilters = getFormPermissionFilter(user, resource, type);
  // check if the form of the record is correct, for populated form or id form
  return {
    $and: [
      {
        $or: [{ 'resource._id': resource._id }, { resource: resource._id }],
      },
      ...(permissionFilters.length > 0 ? [{ $or: permissionFilters }] : []),
    ],
  };
}

/**
 * Extends the user abilities for records with permission of a form
 *
 * @param user user to get ability of
 * @param form form to get permissions of
 * @param resource resource to get permissions of
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
function extendAbilityForRecordsOnForm(
  user: User,
  form: Form,
  resource: Resource,
  ability?: AppAbility
): AppAbility {
  if (ability === undefined) ability = user.ability;
  if (ability.cannot('manage', 'Record') && resource) {
    const abilityBuilder = new AbilityBuilder(appAbility);
    const can = abilityBuilder.can;
    const cannot = abilityBuilder.cannot;

    // copy the existing global abilities from the user
    abilityBuilder.rules = clone(ability.rules);

    // Prevent user to see / update resource / form by default
    cannot('read', 'Resource', ['data.**'], { _id: resource._id });
    cannot('read', 'Form', ['data.**'], { _id: form._id });
    cannot('update', 'Resource', ['data.**'], { _id: resource._id });
    cannot('update', 'Form', ['data.**'], { _id: form._id });

    // Get all accessible fields
    const readableFields = getAccessibleFields('read', user, resource);
    const editableFields = getAccessibleFields('update', user, resource);

    // create a new record
    if (userHasRoleFor('canCreateRecords', user, resource)) {
      // warning: the filter on the form is not used if we call can('create', 'Record')
      // instead of can('create', record) with an already existing record instance
      can('create', 'Record', {
        $or: [{ 'form._id': form._id }, { form: form._id }],
      } as MongoQuery);
    }

    // access a record
    if (userHasRoleFor('canSeeRecords', user, resource)) {
      // can('read', 'Form', { _id: form._id });
      // can('read', 'Resource', { _id: resource._id });
      const filter = formFilters('canSeeRecords', user, resource);
      can('read', 'Record', filter);
      cannot('read', 'Record', ['data.**'], filter);
      if (readableFields.length > 0) {
        can('read', 'Record', readableFields, filter);
      }
      // exception: user cannot read archived records if he cannot update the form
      if (ability.cannot('update', form)) {
        cannot('read', 'Record', { archived: true });
      }
    }

    // update a record
    if (userHasRoleFor('canUpdateRecords', user, resource)) {
      const filter = formFilters('canUpdateRecords', user, resource);
      can('update', 'Record', filter);
      cannot('update', 'Record', ['data.**'], filter);
      if (editableFields.length > 0) {
        can('update', 'Record', editableFields, filter);
      }
    }

    // delete a record
    if (userHasRoleFor('canDeleteRecords', user, resource)) {
      can('delete', 'Record', formFilters('canDeleteRecords', user, resource));
    }

    // Readable fields
    if (readableFields.length > 0) {
      can('read', 'Resource', readableFields, { _id: resource._id });
      can('read', 'Form', readableFields, { _id: form._id });
    }
    // Editable fields
    if (editableFields.length > 0) {
      can('update', 'Resource', editableFields, { _id: resource._id });
      can('update', 'Form', editableFields, { _id: form._id });
    }

    // return the new ability instance
    return abilityBuilder.build({ conditionsMatcher });
  } else {
    return ability;
  }
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
  if (ability.cannot('manage', 'Record')) {
    const forms = await Form.find({ resource: resource._id })
      .select('_id permissions fields')
      .populate({ path: 'resource', model: 'Resource' });
    for (const form of forms) {
      ability = extendAbilityForRecordsOnForm(
        user,
        form,
        await populateResourceFields(form.resource),
        ability
      );
    }
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
  if (ability.cannot('manage', 'Record')) {
    const forms = (
      await Form.find()
        .select('_id name permissions fields')
        .populate({ path: 'resource', model: 'Resource' })
    ).sort((a: any, b: any) =>
      a.resource?.name.localeCompare(b.resource?.name)
    );

    for (const form of forms) {
      ability = extendAbilityForRecordsOnForm(
        user,
        form,
        form.resource,
        ability
      );
    }
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
  } else {
    if (onObject instanceof Form) {
      const resource =
        onObject.resource instanceof Resource
          ? onObject.resource
          : await Resource.findById(onObject.resource, 'fields permissions');

      ability = extendAbilityForRecordsOnForm(
        user,
        onObject as Form,
        await populateResourceFields(resource),
        ability
      );
    } else if (onObject instanceof Resource) {
      ability = await extendAbilityForRecordsOnResource(
        user,
        onObject,
        ability
      );
    } else {
      throw new Error('Unexpected type');
    }
  }
  return ability;
}
