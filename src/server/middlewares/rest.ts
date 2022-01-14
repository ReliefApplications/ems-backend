import passport from 'passport';
import errors from '../../const/errors';
import defineAbilitiesFor from '../../security/defineAbilityFor';
import { config, AuthenticationType } from '../../oort.config';

const strategy =
  config.authenticationType === AuthenticationType.azureAD
    ? 'oauth-bearer'
    : 'keycloak';

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
