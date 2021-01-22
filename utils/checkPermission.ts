import { GraphQLError } from 'graphql/error';
import errors from '../const/errors';
import { User } from '../models/user';

/*  Checks all permissions from the roles associated to the user.
    Returns existence of the permission in user's permissions.
    Throw an error if user not logged.
*/
function checkPermission(user: User, permission: string) {
    if (user) {
        if (user.roles) {
            for (const role of user.roles) {
                for (const rolePermission of role.permissions) {
                    if (rolePermission.type === permission) {
                        return true;
                    }
                }
            }
            return false;
        } else {
            return false;
        }
    } else {
        throw new GraphQLError(errors.userNotLogged);
    }
}

export default checkPermission;