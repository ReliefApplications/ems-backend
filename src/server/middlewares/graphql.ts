import passport from 'passport';
import defineAbilitiesFor from '../../security/defineAbilityFor';
import defineUser from '../../security/defineUser';
import { authenticationType } from '../../oort.config';
import * as dotenv from 'dotenv';
dotenv.config();

/** Authentication strategy */
const strategy =
  process.env.AUTH_TYPE === authenticationType.azureAD
    ? 'oauth-bearer'
    : 'keycloak';

/**
 * Defines the user's abilities in the request user object
 *
 * @param req HTTP request
 * @param res HTTP response
 * @param next Callback argument to the middleware function
 */
export const graphqlMiddleware = (req, res, next) => {
  passport.authenticate(strategy, { session: false }, async (err, user) => {
    if (user) {
      req.user = await defineUser(user, req);
      // Define the rights of the user
      req.user.ability = defineAbilitiesFor(user);
      req.user.isAdmin = user.roles
        ? user.roles.some((x) => !x.application)
        : false;
    }
    next();
  })(req, res, next);
};
