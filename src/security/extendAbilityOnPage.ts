import { AbilityBuilder, Ability, AbilityClass } from '@casl/ability';
import { clone } from 'lodash';
import {
  AppAbility,
  ObjectPermissions,
  conditionsMatcher,
} from './defineUserAbility';
import { Application, Page, User } from '../models';

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
export default async function extendAbilityOnPage(
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
      can('read', 'Page', { _id: page.id });
    }
  }

  // add a special writing permission if the user has a global role
  // within the canUpdate permissions of the application
  if (ability.cannot('update', page)) {
    await requireApplication();
    if (hasApplicationPermission(user, application, 'canUpdate')) {
      can('update', 'Page', { _id: page.id });
    }
  }

  // add a special deleting permission if the user has a global role
  // within the canDelete permissions of the application
  if (ability.cannot('delete', page)) {
    await requireApplication();
    if (hasApplicationPermission(user, application, 'canDelete')) {
      can('delete', 'Page', { _id: page.id });
    }
  }

  // return the new ability instance
  return abilityBuilder.build({ conditionsMatcher });
}
