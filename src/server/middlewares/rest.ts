import passport from 'passport';
import errors from '../../const/errors';
import defineAbilitiesFor from '../../security/defineAbilityFor';

export const restMiddleware = (req, res, next) => {
  passport.authenticate('oauth-bearer', { session: false }, (err, user) => {
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
