import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import { AppAbility, conditionsMatcher, Actions } from './defineUserAbility';
import { Application, Dashboard, Form, Page, User, Workflow } from '../models';
import { extendAbilityForPageOnPage } from './extendAbilityForPage';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

export default async function extendAbilityForPageContent(
  user: User,
  content: Form,
  page: Page,
  ability?: AppAbility
): Promise<AppAbility>;
export default async function extendAbilityForPageContent(
  user: User,
  content: Dashboard | Workflow,
  page?: Page,
  ability?: AppAbility
): Promise<AppAbility>;

/**
 * Extends the user abilities for a page content, ie a workflow, a dashboard, or
 * a form.
 *
 * @param user user to get ability of
 * @param content The content object
 * @param page The page of the content (optional for workflows and dashboards)
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
export default async function extendAbilityForPageContent(
  user: User,
  content: Workflow | Dashboard | Form,
  page?: Page,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;
  if (page === undefined) page = await Page.findOne({ content: content._id });
  const application = await Application.findOne({ pages: page._id });

  // get the permissions of the page
  ability = await extendAbilityForPageOnPage(user, page, application, ability);

  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;

  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  // for each permission, give it if one page with this content already has the permission
  for (const action of ['read', 'update', 'delete'] as Actions[]) {
    if (ability.cannot(action, content) && ability.can(action, page)) {
      if (content instanceof Dashboard)
        can(action, 'Dashboard', { _id: content._id });
      if (content instanceof Workflow)
        can(action, 'Workflow', { _id: content._id });
      if (content instanceof Form) can(action, 'Form', { _id: content._id });
    }
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}
