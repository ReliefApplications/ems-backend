import passport from 'passport';
import errors from '../../const/errors';
import defineAbilitiesFor from '../../security/defineAbilityFor';
import { authenticationType } from '../../oort.config';
import * as dotenv from 'dotenv';
dotenv.config();

/** Authentication strategy */
const strategy =
  process.env.AUTH_PROVIDER === authenticationType.azureAD
    ? 'oauth-bearer'
    : 'keycloak';

/**
 * Defines the user's abilities in the request context
 *
 * @param req HTTP request
 * @param res HTTP response
 * @param next Callback argument to the middleware function
 */
export const restMiddleware = (req, res, next) => {
  passport.authenticate(strategy, { session: false }, (err, user) => {
    if (user) {
      req.context = { user };
      // req.context.user = user;
      // Define the rights of the user
      req.context.user.ability = defineAbilitiesFor(user);
      next();
    } else {
      res.status(401).send(errors.userNotLogged);
    }
  })(req, res, next);
};
