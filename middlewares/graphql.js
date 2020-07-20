const passport =  require('passport');
const graphqlHTTP = require('express-graphql');
const schema = require('../schema/schema');

module.exports = graphqlHTTP((req, res) => {
    return new Promise((resolve, reject) => {

        const next = (user, info = {}) => {
            console.log(user);
            if (!user) { reject('Invalid credentials.'); }
            resolve({
                schema,
                graphiql: true,
                context: {
                    user: user || null,
                },
            });
        };

        passport.authenticate('oauth-bearer', {session: false}, (err, user) => {
            next(user);
        })(req, res, next);
    });
});