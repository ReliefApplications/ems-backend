import { AppAbility } from './defineUserAbility';
import { Form, Resource, User } from '../models';
import extendAbilityOnForm from './extendAbilityOnForm';

/**
 * Extends the user abilities on records for every forms of the website,
 * or every form of a resource if a resource is given.
 *
 * @param user user to get ability of
 * @param resource The resource of which we want the forms (optional)
 * @returns ability definition of the user
 */
export default async function extendAbilityOnAllForms(
  user: User,
  resource?: Resource
): Promise<AppAbility> {
  // get the initial ability object
  let ability: AppAbility = user.ability;

  // Get all forms
  const filter = resource ? { resource: resource._id } : {};
  const forms = await Form.find(filter).select('_id permissions');

  // Iterate on all forms to add the conditions of each one
  for (const form of forms) {
    ability = extendAbilityOnForm(user, form, ability);
  }

  // return the new ability instance
  return ability;
}
