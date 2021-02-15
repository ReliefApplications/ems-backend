import passport from 'passport';

export default (req, res, next) => {
    passport.authenticate('oauth-bearer', {session: false}, (err, user) => {
        if (user) {
            req.user = user;
        }
        next();
    })(req, res, next);
};
