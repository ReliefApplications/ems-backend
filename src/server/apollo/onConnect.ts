import { AuthenticationError } from 'apollo-server-express';
import jwt_decode from 'jwt-decode';
import { User } from '../../models';

export default (connectionParams: any) => {
    if (connectionParams.authToken) {
        const token: any = jwt_decode(connectionParams.authToken);
        return User.findOne({ 'oid': token.oid }).populate({
            // Add to the user context all roles / permissions it has
            path: 'roles',
            model: 'Role',
            populate: {
                path: 'permissions',
                model: 'Permission'
            },
        });
    } else {
        throw new AuthenticationError('No token');
    }
}
