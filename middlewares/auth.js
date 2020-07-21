const express = require('express');
const passport = require('passport');
// import { Strategy as BearerStrategy } from 'passport-http-bearer';
const BearerStrategy = require('passport-azure-ad').BearerStrategy;
const authenticatedUserTokens = [];
const User = require('../models/user');

const credentials = {
    identityMetadata: 'https://login.microsoftonline.com/fbacd48d-ccf4-480d-baf0-31048368055f/v2.0/.well-known/openid-configuration', 
    clientID: 'd62083d8-fdc0-4a6a-8618-652380eebdb9'
};

/**
 * Here, we have to find the user
 * based on the given token (authentication).
 * Assuming we use the Bearer strategy,
 * but we can replace the strategy with any other strategy of course.
 */
passport.use(new BearerStrategy(credentials, (token, done) => {
    User.findOne({ 'oid': token.oid }, (err, user) => {
        if (err) {
            return done(err);
        }

        if (user) {
            return done(null, user, token);
        } else {
            let newUser = new User();
            newUser.username = token.preferred_username;
            newUser.name = token.name;
            newUser.role = null;
            newUser.oid = token.oid;
            newUser.save(err => {
                if (err) {
                    throw err;
                }
                return done(null, newUser, token);
            });
        }
    });
}));

const middleware = express();
middleware.use(passport.initialize());
middleware.use(passport.session());
module.exports = middleware;