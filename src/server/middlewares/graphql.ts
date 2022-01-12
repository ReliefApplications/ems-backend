import passport from 'passport';
import defineAbilitiesFor from '../../security/defineAbilityFor';

export const graphqlMiddleware = (req, res, next) => {
  passport.authenticate('oauth-bearer', { session: false }, (err, user) => {
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
