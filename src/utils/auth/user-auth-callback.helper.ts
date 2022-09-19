import { getAutoAssignedRoles } from './role-assignment.helper';
import { User } from '../../models';

/**
 * Callback executed after authentication of user
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
  const autoAssignedRoles = await getAutoAssignedRoles(user);
  user.roles = [...user.roles, ...autoAssignedRoles];
  return done(null, user, token);
};
