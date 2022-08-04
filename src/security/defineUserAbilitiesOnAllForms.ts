import {
  AbilityBuilder,
  Ability,
  AbilityClass,
  MongoQuery,
} from '@casl/ability';
import { clone } from 'lodash';
import { AppAbility, conditionsMatcher } from './defineUserAbilities';
import { Form, Resource, Record, User } from '../models';
import defineUserAbilitiesOnForm from './defineUserAbilitiesOnForm';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Extends the user abilities for records for every forms of the website,
 * or every form of a resource if a resource is given.
 *
 * @param user user to get ability of
 * @param resource The resource of which we want the form (optional)
 * @returns ability definition of the user
 */
export default async function defineUserAbilitiesOnAllForms(
  user: User,
  resource?: Resource
): Promise<AppAbility> {
  // copy the existing global abilities from the user
  let ability: AppAbility = user.ability;

  // Get all forms
  const filter = resource ? { resource: resource._id } : {};
  const forms = await Form.find(filter).select('_id permissions');

  // Iterate on all forms to add the conditions of each one
  for (const form of forms) {
    console.dir(ability.rules, { depth: 10 });
    ability = defineUserAbilitiesOnForm({ ...user, ability } as User, form);
  }

  // return the new ability instance
  return ability;
}
