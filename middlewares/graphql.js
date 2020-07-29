const passport =  require('passport');
const graphqlHTTP = require('express-graphql');
const schema = require('../schema/schema');

module.exports = graphqlHTTP((req, res) => {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {

        // eslint-disable-next-line no-unused-vars
        const next = (user, info = {}) => {
            resolve({
                schema,
                graphiql: true,
                context: {
                    user: user || null,
                },
            });
        };

        passport.authenticate('oauth-bearer', {session: false}, (err, user) => {
            if (err) {
                return next(err);
            }
            next(user);
        })(req, res, next);
    });
});