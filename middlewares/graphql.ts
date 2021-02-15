import passport from 'passport';
import defineAbilitiesFor from '../utils/defineAbilityFor';

export default (req, res, next) => {
    passport.authenticate('oauth-bearer', {session: false}, (err, user) => {
        if (user) {
            req.user = user;
            req.user.ability = defineAbilitiesFor(user);
        }
        next();
    })(req, res, next);
};
