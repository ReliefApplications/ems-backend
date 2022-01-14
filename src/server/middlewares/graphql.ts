import passport from 'passport';
import defineAbilitiesFor from '../../security/defineAbilityFor';
import { config, authenticationType } from '../../oort.config';

const strategy =
  config.authenticationType === authenticationType.azureAD
    ? 'oauth-bearer'
    : 'keycloak';

export const graphqlMiddleware = (req, res, next) => {
  passport.authenticate(strategy, { session: false }, (err, user) => {
    if (user) {
      req.user = user;
      // Define the rights of the user
      req.user.ability = defineAbilitiesFor(user);
      req.user.isAdmin = user.roles
        ? user.roles.some((x) => !x.application)
        : false;
    }
    next();
  })(req, res, next);
};
