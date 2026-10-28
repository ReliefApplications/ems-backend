import { Client, User } from '@models';

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
 * The identity id (oid) is matched first. The username is only used as a fallback
 * for accounts that were invited by email and never logged in, i.e. that hold no
 * identity id yet: an account already bound to an identity can never be taken over
 * by another identity presenting the same username (for example from another tenant
 * accepted by the issuer configuration).
 *
 * @param token decoded bearer token claims
 * @param token.oid identity id of the user
 * @param token.username username (email) of the user
 * @returns populated user, or null
 */
export const findUserByToken = async (token: {
  oid?: string;
  username?: string;
}): Promise<User | null> => {
  if (token.oid) {
    const user = await populatePrincipal(User.findOne({ oid: token.oid }));
    if (user) {
      return user;
    }
  }
  if (!token.username) {
    return null;
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
