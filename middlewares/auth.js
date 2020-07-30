const express = require('express');
const passport = require('passport');
const BearerStrategy = require('passport-azure-ad').BearerStrategy;
const User = require('../models/user');

require('dotenv').config();

// Azure Active Directory configuration
const credentials = {
    // eslint-disable-next-line no-undef
    identityMetadata: `https://login.microsoftonline.com/${process.env.tenantID}/v2.0/.well-known/openid-configuration`,
    // eslint-disable-next-line no-undef
    clientID: `${process.env.clientID}`
};

passport.use(new BearerStrategy(credentials, (token, done) => {
    // Checks if user already exists in the DB
    User.findOne({ 'oid': token.oid }, (err, user) => {
        if (err) {
            return done(err);
        }

        if (user) {
            // Returns the user if found
            return done(null, user, token);
        } else {
            // Creates the user from azure oid if not found
            let newUser = new User();
            newUser.username = token.preferred_username;
            newUser.name = token.name;
            newUser.roles = [];
            newUser.oid = token.oid;
            newUser.save(err => {
                if (err) {
                    console.log(err);
                }
                return done(null, newUser, token);
            });
        }
    }).populate({
        // Add to the user context all roles / permissions it has
        path: 'roles',
        model: 'Role', 
        populate: {
            path: 'permissions',
            model: 'Permission'
        }
    });
}));

const middleware = express();
middleware.use(passport.initialize());
middleware.use(passport.session());
module.exports = middleware;