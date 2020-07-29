const { GraphQLError } = require('graphql/error');
const errors = require('../const/errors');

/*  Checks all permissions from the roles associated to the user.
    Returns existence of the permission in user's permissions.
    Throw an error if user not logged.
*/
function checkPermission(user, permission) {
    if (user) {
        if (user.roles) {
            for (let role of user.roles) {
                for (let rolePermission of role.permissions) {
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

module.exports = checkPermission;