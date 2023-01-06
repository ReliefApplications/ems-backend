import passport from 'passport';
import defineUserAbility from '@security/defineUserAbility';
import { AuthenticationType } from '../../oort.config';
import i18next from 'i18next';
import config from 'config';

/** Authentication strategy */
const strategy =
  config.get('auth.provider') === AuthenticationType.azureAD
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
      req.context.user.ability = defineUserAbility(user);
      next();
    } else {
      res.status(401).send(i18next.t('common.errors.userNotLogged'));
    }
  })(req, res, next);
};
