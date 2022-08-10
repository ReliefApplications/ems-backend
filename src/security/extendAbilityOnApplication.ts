import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import { AppAbility, conditionsMatcher } from './defineUserAbility';
import extendAbilityOnPage from './extendAbilityOnPage';
import { Application, Page, User } from '../models';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Extends the user abilities for an application with the permission of all pages
 *
 * @param user user to get ability of
 * @param application The application of the page, if known (optional)
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
export default async function extendAbilityOnApplication(
  user: User,
  application: Application,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;

  const pages = application.populated('pages')
    ? (application.pages as Page[])
    : await Page.find({ _id: { $in: application.pages } });

  for (const page of pages) {
    ability = await extendAbilityOnPage(user, page, application, ability);
  }

  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;
  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  if (ability.can('update', application)) {
    can('create', 'Page');
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}
