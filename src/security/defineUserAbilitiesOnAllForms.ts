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
  // Get all forms
  const filter = resource ? { resource: resource._id } : {};
  const forms = await Form.find(filter).select('_id permissions');

  // Get the filter for all forms
  const allFormReadFilters = [];
  const allFormUpdateFilters = [];
  const allFormDeleteFilters = [];
  for (const form of forms) {
    const ability: AppAbility = defineUserAbilitiesOnForm(user, form);
    const readFilters = Record.accessibleBy(ability, 'read').getFilter();
    const updateFilters = Record.accessibleBy(ability, 'update').getFilter();
    const deleteFilters = Record.accessibleBy(ability, 'delete').getFilter();
    allFormReadFilters.push(readFilters);
    allFormUpdateFilters.push(updateFilters);
    allFormDeleteFilters.push(deleteFilters);
  }

  // Create the new ability object
  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;

  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(user.ability.rules);

  // access a record
  if (user.ability.cannot('read', 'Record')) {
    can('read', 'Record', { $or: allFormReadFilters } as MongoQuery);
  }

  // update a record
  if (user.ability.cannot('update', 'Record')) {
    can('update', 'Record', { $or: allFormUpdateFilters } as MongoQuery);
  }

  // delete a record
  if (user.ability.cannot('delete', 'Record')) {
    can('delete', 'Record', { $or: allFormDeleteFilters } as MongoQuery);
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}
