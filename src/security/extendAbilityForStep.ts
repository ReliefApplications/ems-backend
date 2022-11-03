import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import {
  AppAbility,
  ObjectPermissions,
  conditionsMatcher,
} from './defineUserAbility';
import { Application, Page, Step, User, Workflow } from '@models';

/** Application ability class */
const appAbility = Ability as AbilityClass<AppAbility>;

/**
 * Check if the user has a role with permission for this application,
 * where the permission is stored within the application object.
 *
 * @param user The user
 * @param application The application
 * @param permissionType The permission
 * @returns A boolean indicating if the user has the permission
 */
function hasApplicationPermission(
  user: User,
  application: Application,
  permissionType: ObjectPermissions
) {
  const appRoles = application.permissions[permissionType].map(
    (role: any) => role._id
  );
  const userRoles = user.roles?.map((role) => role._id);
  return appRoles.some((role) => userRoles.includes(role));
}

/**
 * Extends the user abilities for a page
 *
 * @param user user to get ability of
 * @param step The step we want to know the permissions
 * @param helper The app if known, or the page, or the workflow, to avoid too many calculations (optional)
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
export async function extendAbilityForStepOnStep(
  user: User,
  step: Step,
  helper?: Workflow | Page | Application,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;

  /** @returns Load the application only when needed */
  const requireApplication = async () => {
    if (helper === undefined) {
      helper = await Workflow.findOne({ steps: step._id });
    }
    if (helper instanceof Workflow) {
      helper = await Page.findOne({ content: helper._id });
    }
    if (helper instanceof Page) {
      helper = await Application.findOne({ pages: helper._id });
    }
    return helper;
  };

  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;
  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  // add a special reading permission if the user has a global role
  // within the canSee permissions of the application
  if (ability.cannot('read', step)) {
    const app = await requireApplication();
    if (hasApplicationPermission(user, app, 'canSee')) {
      can('read', 'Step', { _id: step.id });
    }
  }

  // add a special writing permission if the user has a global role
  // within the canUpdate permissions of the application
  if (ability.cannot('update', step)) {
    const app = await requireApplication();
    if (hasApplicationPermission(user, app, 'canUpdate')) {
      can('update', 'Step', { _id: step.id });
    }
  }

  // add a special deleting permission if the user has a global role
  // within the canDelete permissions of the application
  if (ability.cannot('delete', step)) {
    const app = await requireApplication();
    if (hasApplicationPermission(user, app, 'canDelete')) {
      can('delete', 'Step', { _id: step.id });
    }
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}

/**
 * Extends the user abilities for an application with the permission of all pages
 *
 * @param user user to get ability of
 * @param workflow The workflow of the steps we want to extend
 * @param helper A The page or application corresponding to the workflow, to avoid too many calculations (optional)
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
async function extendAbilityForStepOnWorkflow(
  user: User,
  workflow: Workflow,
  helper?: Page | Application,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;
  if (helper === undefined) {
    helper = await Page.findOne({ content: workflow._id });
  }
  if (helper instanceof Page) {
    helper = await Application.findOne({ pages: helper._id });
  }

  const steps = workflow.populated('steps')
    ? (workflow.steps as Step[])
    : await Step.find({ _id: { $in: workflow.steps } });

  for (const step of steps) {
    ability = await extendAbilityForStepOnStep(user, step, helper, ability);
  }

  // add create page permission for the application
  const abilityBuilder = new AbilityBuilder(appAbility);
  abilityBuilder.rules = clone(ability.rules);
  if (ability.can('update', workflow)) {
    abilityBuilder.can('create', 'Step');
  }
  return abilityBuilder.build({ conditionsMatcher });
}

/**
 * Extends the user abilities for page permissions. Can be extended from
 * the page we want to check, or from the application to extend for all the
 * pages of the application
 *
 * @param user The user instance
 * @param onObject The page or application to get the pages permission from
 * @param ability An ability instance (optional - by default user.ability)
 * @returns The extended ability object
 */
export default async function extendAbilityForStep(
  user: User,
  onObject: Step | Workflow,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;

  if (onObject instanceof Step) {
    return extendAbilityForStepOnStep(user, onObject, undefined, ability);
  } else if (onObject instanceof Workflow) {
    return extendAbilityForStepOnWorkflow(user, onObject, undefined, ability);
  } else {
    throw new Error('Unexpected type');
  }
}
