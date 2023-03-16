import { User } from '@models';
import NodeCache from 'node-cache';
import { updateUserAttributes } from './updateUserAttributes';
import { updateUserGroups } from './updateUserGroups';
import { getAutoAssignedRoles } from './getAutoAssignedRoles';
import { isNil } from 'lodash';

/** Local storage initialization */
const cache: NodeCache = new NodeCache({ checkperiod: 60 });

/** Number of minutes spent before we're refreshing user attributes */
const MINUTES_BEFORE_REFRESH = 2;

/** Suffix to user ID for caching roles */
const ROLES_KEY = '.roles';

/** Interface for Groups list settings. */
export interface GroupListSettings {
  apiConfiguration: string;
  endpoint: string;
  path: string;
  id: string;
  title: string;
  description: string;
}

/** Interface for User's groups settings. */
export interface UserGroupSettings {
  apiConfiguration: string;
  endpoint: string;
  path: string;
  id: string;
}

/** Interface for Groups settings. */
export interface GroupSettings {
  local: boolean;
  list?: GroupListSettings;
  user?: UserGroupSettings;
}

/** Interface for Attributes settings. */
export interface AttributeSettings {
  local: boolean;
  list?: {
    value: string;
    text: string;
  }[];
  apiConfiguration?: string;
  endpoint?: string;
  mapping?: {
    field: string;
    value: any;
    text: string;
  }[];
}

/** Interface for User Management */
export interface UserSettings {
  groups: GroupSettings;
  attributes: AttributeSettings;
}

/**
 * Used to check wether we should update the user attributes or not.
 * We should update user attributes only if the config changed, meaning the whole server restarted.
 */
/**
 * Check wether we should update the user attributes or not.
 *
 * @param user Logged user.
 * @param offset Number of minutes to wait between each update.
 * @returns Boolean.
 */
const userNeedsUpdate = (
  user: User,
  offset: number = MINUTES_BEFORE_REFRESH
): boolean => {
  const lastUpdate: number = cache.get(user._id.toString());
  const currentTime: number = new Date().getTime();
  if (lastUpdate) {
    if (currentTime < lastUpdate + offset * 60000) return false;
  }
  cache.set(user._id.toString(), currentTime);
  return true;
};

/**
 * Check if we need to update user groups and attributes and perform it when needed.
 *
 * @param user Logged user to update.
 * @param req Original req.
 * @returns Boolean to indicate if there is any change in the user.
 */
export const updateUser = async (user: User, req: any): Promise<boolean> => {
  // Check if we really need to fetch new ones
  if (!userNeedsUpdate(user)) return false;
  const userChanges: boolean[] = await Promise.all([
    updateUserAttributes(user, req),
    updateUserGroups(user, req),
  ]);
  for (const update of userChanges) {
    if (update) return true;
  }
  return false;
};

/**
 * Callback executed after authentication of user.
 * Auto-assigned roles are added at this stage.
 *
 * @param error process error
 * @param done done callback of authentication process
 * @param token current token
 * @param user current user
 * @returns authentication process callback
 */
export const userAuthCallback = async (
  error: any,
  done: any,
  token: any,
  user: User
) => {
  if (error) {
    return done(error);
  }
  const cacheKey = user._id.toString() + ROLES_KEY;
  const cacheValue: any[] = cache.get(cacheKey);
  if (!isNil(cacheValue)) {
    const userObj = user.toObject();
    const newRoles = cacheValue.filter((role) => {
      const { _id: id } = role;
      return userObj.roles.map((x: any) => x._id.equals(id));
    });

    return done(
      null,
      {
        ...userObj,
        roles: [...userObj.roles, ...newRoles],
      },
      token
    );
  } else {
    const autoAssignedRoles = await getAutoAssignedRoles(user);
    cache.set(
      cacheKey,
      autoAssignedRoles.map((x) => x.toObject()),
      60 * MINUTES_BEFORE_REFRESH
    );
    user.roles = [...user.roles, ...autoAssignedRoles];
    return done(null, user, token);
  }
};
