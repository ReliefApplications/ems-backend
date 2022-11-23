import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import {
  AppAbility,
  ObjectPermissions,
  conditionsMatcher,
} from './defineUserAbility';
import { Application, Page, User } from '@models';

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
 * @param page The page we want to know the permissions
 * @param application The application of the page, if known (optional)
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
export async function extendAbilityForPageOnPage(
  user: User,
  page: Page,
  application?: Application,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;

  /** Load the application only if it is needed */
  const requireApplication = async () => {
    if (application === undefined) {
      application = await Application.findOne({ pages: page._id });
    }
  };

  const abilityBuilder = new AbilityBuilder(appAbility);
  const can = abilityBuilder.can;
  // copy the existing global abilities from the user
  abilityBuilder.rules = clone(ability.rules);

  // add a special reading permission if the user has a global role
  // within the canSee permissions of the application
  if (ability.cannot('read', page)) {
    await requireApplication();
    if (hasApplicationPermission(user, application, 'canSee')) {
      can('read', 'Page', { _id: page._id });
    }
  }

  // add a special writing permission if the user has a global role
  // within the canUpdate permissions of the application
  if (ability.cannot('update', page)) {
    await requireApplication();
    if (hasApplicationPermission(user, application, 'canUpdate')) {
      can('update', 'Page', { _id: page._id });
    }
  }

  // add a special deleting permission if the user has a global role
  // within the canDelete permissions of the application
  if (ability.cannot('delete', page)) {
    await requireApplication();
    if (hasApplicationPermission(user, application, 'canDelete')) {
      can('delete', 'Page', { _id: page._id });
    }
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}

/**
 * Extends the user abilities for an application with the permission of all pages
 *
 * @param user user to get ability of
 * @param application The application of the page, if known (optional)
 * @param ability The ability object to extend from, if different form the user ability (optional)
 * @returns ability definition of the user
 */
async function extendAbilityForPageOnApplication(
  user: User,
  application: Application,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;

  const pages = application.populated('pages')
    ? (application.pages as Page[])
    : await Page.find({ _id: { $in: application.pages } });

  for (const page of pages) {
    ability = await extendAbilityForPageOnPage(
      user,
      page,
      application,
      ability
    );
  }

  // add create page permission for the application
  const abilityBuilder = new AbilityBuilder(appAbility);
  abilityBuilder.rules = clone(ability.rules);
  if (ability.can('update', application)) {
    abilityBuilder.can('create', 'Page');
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
export default async function extendAbilityForPage(
  user: User,
  onObject: Application | Page,
  ability?: AppAbility
): Promise<AppAbility> {
  if (ability === undefined) ability = user.ability;

  if (onObject instanceof Page) {
    return extendAbilityForPageOnPage(user, onObject, undefined, ability);
  } else if (onObject instanceof Application) {
    return extendAbilityForPageOnApplication(user, onObject, ability);
  } else {
    throw new Error('Unexpected type');
  }
}
