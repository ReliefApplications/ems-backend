import { AuthenticationError } from 'apollo-server-express';
import errors from '../../const/errors';
import { graphqlMiddleware } from '../middlewares';

export default (connectionParams, ws: any) => {
    if (connectionParams.authToken) {
        ws.upgradeReq.headers.authorization = `Bearer ${connectionParams.authToken}`;
        return new Promise(res => {
            graphqlMiddleware(ws.upgradeReq, {} as any, () => {
                res(ws.upgradeReq);
            })
        });
    } else {
        throw new AuthenticationError(errors.authenticationTokenNotFound);
    }
}
