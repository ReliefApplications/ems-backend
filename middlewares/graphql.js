const passport =  require('passport');

module.exports = (req, res, next) => {
    passport.authenticate('oauth-bearer', {session: false}, (err, user) => {
        if (user) {
            req.user = user;
        }
        next();
    })(req, res, next);
};