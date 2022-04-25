import passport from 'passport';
import defineAbilitiesFor from '../../security/defineAbilityFor';
import { authenticationType } from '../../oort.config';
import * as dotenv from 'dotenv';
import i18next from 'i18next';
dotenv.config();

const strategy =
  process.env.AUTH_TYPE === authenticationType.azureAD
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
      res.status(401).send(i18next.t('errors.userNotLogged'));
    }
  })(req, res, next);
};
