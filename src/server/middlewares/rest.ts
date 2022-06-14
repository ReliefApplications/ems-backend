import passport from 'passport';
import defineAbilitiesFor from '../../security/defineAbilityFor';
import defineUser from '../../security/defineUser';
import { authenticationType } from '../../oort.config';
import * as dotenv from 'dotenv';
import i18next from 'i18next';
dotenv.config();

/** Authentication strategy */
const strategy =
  process.env.AUTH_TYPE === authenticationType.azureAD
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
  passport.authenticate(strategy, { session: false }, async (err, user) => {
    if (user) {
      req.context = { user: await defineUser(user, req) };
      // req.context.user = user;
      // Define the rights of the user
      req.context.user.ability = defineAbilitiesFor(user);
      next();
    } else {
      res.status(401).send(i18next.t('errors.userNotLogged'));
    }
  })(req, res, next);
};
