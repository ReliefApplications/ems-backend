import passport from 'passport';
import defineUserAbility from '@security/defineUserAbility';
import { AuthenticationType } from '../../oort.config';
import config from 'config';

/** Authentication strategy */
const strategy =
  config.get('auth.provider') === AuthenticationType.azureAD
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
  passport.authenticate(strategy, { session: false }, (err, user) => {
    if (user) {
      req.user = user;
      // Define the rights of the user
      req.user.ability = defineUserAbility(user);
      // req.user.isAdmin = user.roles
      //   ? user.roles.some((x) => !x.application)
      //   : false;
    }
    next();
  })(req, res, next);
};
