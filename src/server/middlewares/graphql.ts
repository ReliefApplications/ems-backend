import passport from 'passport';
import defineAbilitiesFor from '../../security/defineAbilityFor';
import { authenticationType } from '../../oort.config';
import * as dotenv from 'dotenv';
dotenv.config();

const strategy =
  process.env.AUTH_TYPE === authenticationType.azureAD
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
