const { GraphQLError } = require('graphql/error');

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
        throw new GraphQLError('You must be connected.');
    }
    
}

module.exports = checkPermission;