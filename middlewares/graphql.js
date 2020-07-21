const passport =  require('passport');
const graphqlHTTP = require('express-graphql');
const schema = require('../schema/schema');
// const { GraphQLError } = require('graphql/error');

module.exports = graphqlHTTP((req, res) => {
    return new Promise((resolve, reject) => {

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
            if (!user) {
                return res.status(401).send({ success : false, message : 'User not found.' });
            }
            next(user);
        })(req, res, next);
    });
});