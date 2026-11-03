import { Client, User } from '@models';
import { logger } from '@services/logger.service';

/**
 * Populates roles (with permissions) and position attributes of a principal query.
 *
 * @param query principal query
 * @returns populated query
 */
const populatePrincipal = (query: any) =>
  query
    .populate({
      // Add to the context all roles / permissions the principal has
      path: 'roles',
      model: 'Role',
      populate: {
        path: 'permissions',
        model: 'Permission',
      },
    })
    .populate({
      // Add to the context all positionAttributes with corresponding categories
      path: 'positionAttributes.category',
      model: 'PositionAttributeCategory',
    });

/**
 * Finds the user matching a bearer token.
 *
 * The identity id (oid) is matched first. The username is then used as a fallback:
 * - by default, only for accounts that were invited by email and never logged in,
 * i.e. that hold no identity id yet: an account already bound to an identity can never
 * be taken over by another identity presenting the same username (for example from
 * another tenant accepted by the issuer configuration);
 * - with allowIdentityChange, for any account: used when a single directory is trusted
 * (one Azure tenant, one Keycloak realm), where the same username with a new identity
 * id is the same person whose directory account was recreated. The caller then binds
 * the account to the new identity id.
 *
 * @param token decoded bearer token claims
 * @param token.oid identity id of the user
 * @param token.username username (email) of the user
 * @param options lookup options
 * @param options.allowIdentityChange match accounts bound to another identity id by username
 * @returns populated user, or null
 */
export const findUserByToken = async (
  token: {
    oid?: string;
    username?: string;
  },
  options: { allowIdentityChange?: boolean } = {}
): Promise<User | null> => {
  if (token.oid) {
    const user = await populatePrincipal(User.findOne({ oid: token.oid }));
    if (user) {
      return user;
    }
  }
  if (!token.username) {
    return null;
  }
  // Without identity id in the token, an account can never be rebound
  if (options.allowIdentityChange && token.oid) {
    const user = await populatePrincipal(
      User.findOne({ username: token.username })
    );
    if (user?.oid) {
      logger.warn('User identity id changed, account bound to the new one', {
        user: user._id.toString(),
        previousOid: user.oid,
        oid: token.oid,
      });
    }
    return user;
  }
  return populatePrincipal(
    User.findOne({ username: token.username, oid: null })
  );
};

/**
 * Finds the client application matching a bearer token, with the same rule as users:
 * identity id first, client id only for clients that hold no identity id yet.
 *
 * @param token decoded bearer token claims
 * @param token.oid identity id of the service principal
 * @param token.clientId application (client) id
 * @returns populated client, or null
 */
export const findClientByToken = async (token: {
  oid?: string;
  clientId?: string;
}): Promise<Client | null> => {
  if (token.oid) {
    const client = await populatePrincipal(Client.findOne({ oid: token.oid }));
    if (client) {
      return client;
    }
  }
  if (!token.clientId) {
    return null;
  }
  return populatePrincipal(
    Client.findOne({ clientId: token.clientId, oid: null })
  );
};
