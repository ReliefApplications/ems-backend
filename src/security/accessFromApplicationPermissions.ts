import { Actions, AppAbility } from './defineUserAbilities';
import { Page, Step, Application, Workflow } from '../models';

/**
 * Get a boolean to know if user has access to a content (Dashboard / Form / Workflow) depending on parent application permissions.
 *
 * /!\ /!\ /!\
 * IN REALITY: it just checks if user has global permission to see applications.
 * /!\ /!\ /!\
 *
 * @param content ID of the content (Dashboard / Form / Workflow).
 * @param access Access we seek for the content.
 * @param ability User's ability.
 * @returns Boolean to give access or not to the content.
 */
export async function canAccessContent(
  content: string,
  access: Actions,
  ability: AppAbility
): Promise<boolean> {
  const appAccess: Actions = access === 'read' ? 'read' : 'update';
  if (ability.cannot(appAccess, 'Application')) {
    return false;
  }
  let page = await Page.findOne({ content: content }).select('id');
  if (!page) {
    const step = await Step.findOne({ content: content }).select('id');
    const workflow = await Workflow.findOne({ steps: step?.id }, 'id');
    page = await Page.findOne({ content: workflow?.id }).select('id');
  }
  if (page) {
    const application = await Application.findOne(
      { pages: page?.id },
      'id'
    ).accessibleBy(ability, appAccess);
    return !!application;
  }
  return false;
}
