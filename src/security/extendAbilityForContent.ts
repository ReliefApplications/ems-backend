import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import { AppAbility, conditionsMatcher, Actions } from './defineUserAbility';
import {
  Application,
  Dashboard,
  Form,
  Page,
  Step,
  User,
  Workflow,
} from '@models';
import { extendAbilityForPageOnPage } from './extendAbilityForPage';
import { extendAbilityForStepOnStep } from './extendAbilityForStep';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Extends the user abilities for a page or step content, ie a workflow,
 * a dashboard, or a form, by using the abilities of the container (page or step).
 * For a form, you must indicate on which page or step it is used.
 *
 * @param user The user instance
 * @param content The content object (a workflow, dashboard, or form)
 * @param container The page or step which contains the content (optional for workflows and dashboards)
 * @param application The application of this content, if known, to reduce calculations (optional)
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
export default async function extendAbilityForContent(
  user: User,
  content: Workflow | Dashboard | Form,
  container?: Page | Step,
  application?: Application,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;
  if (container === undefined) {
    container = await Page.findOne({ content: content._id });
    if (!container) container = await Step.findOne({ content: content._id });
    // if the content is not on any pages (eg a form), do not change anything
    if (!container) return ability;
  }

  // get the permissions of the page or the step
  if (container instanceof Page) {
    ability = await extendAbilityForPageOnPage(
      user,
      container,
      application,
      ability
    );
  } else {
    ability = await extendAbilityForStepOnStep(
      user,
      container,
      application,
      ability
    );
  }

  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;

  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  // for each permission, give it if one page with this content already has the permission
  for (const action of ['read', 'update', 'delete'] as Actions[]) {
    if (ability.cannot(action, content) && ability.can(action, container)) {
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
