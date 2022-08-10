import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import { AppAbility, conditionsMatcher, Actions } from './defineUserAbility';
import { Application, Dashboard, Form, Page, User, Workflow } from '../models';
import extendAbilityOnPage from './extendAbilityOnPage';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Extends the user abilities for a page content, ie a workflow or a dashboard.
 * For a form, please use extendAbilityOnForm to also give permissions to the records.
 *
 * @param user user to get ability of
 * @param content The content object
 * @param pages The page of the content, if known (optional)
 * @param applications The application of the page, if known (optional)
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
export default async function extendAbilityOnPageContent(
  user: User,
  content: Workflow | Dashboard | Form,
  pages?: Page[],
  applications?: Application[],
  ability?: AppAbility
): Promise<AppAbility> {
  // get the ability
  if (ability === undefined) ability = user.ability;
  // get the pages corresponding to the content
  if (pages) {
    pages = pages.filter((p) => p.content.equals(content._id));
  } else {
    pages = await Page.find({ content: content._id });
  }
  // get the applications corresponding to the pages
  if (applications) {
    applications = applications.filter((app) =>
      app.pages.some((appPage) =>
        pages.some((page) => appPage.equals(page._id))
      )
    );
    applications = await Application.find({
      pages: { $in: pages.map((p) => p._id) },
    });
  }

  // get the permissions of the page
  for (const page of pages) {
    const application = applications.find((app) =>
      app.pages.some((p) => p.equals(page.id))
    );
    ability = await extendAbilityOnPage(user, page, application, ability);
  }

  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;

  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  // for each permission, give it if one page with this content already has the permission
  for (const action of ['read', 'update', 'delete'] as Actions[]) {
    if (
      ability.cannot(action, content) &&
      pages.some((page) => ability.can(action, page))
    ) {
      can(action, ['Workflow', 'Dashboard', 'Form'], {
        _id: content._id,
        kind: content.kind,
      });
    }
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}
