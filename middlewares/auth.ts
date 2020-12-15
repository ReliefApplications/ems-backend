import express from 'express';
import passport from 'passport';
import { GraphQLLocalStrategy } from 'graphql-passport';
import { BearerStrategy } from 'passport-azure-ad';
import * as dotenv from 'dotenv';
import { User } from '../models';
dotenv.config();

// Azure Active Directory configuration
const credentials = {
    // eslint-disable-next-line no-undef
    identityMetadata: `https://login.microsoftonline.com/${process.env.tenantID}/v2.0/.well-known/openid-configuration`,
    // eslint-disable-next-line no-undef
    clientID: `${process.env.clientID}`
};

// Add a GraphQLStrategy as in this example: https://github.com/jkettmann/authentication-with-graphql-passport-and-react
passport.use(
    new GraphQLLocalStrategy((username, password, done) => {
      const users = User.find();
      const matchingUser = users.find(user => username === user.username && password === user.oid);
      const error = matchingUser ? null : new Error('no matching user');
      done(error, matchingUser);
    }),
  );

passport.use(new BearerStrategy(credentials, (token: any, done) => {
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
            const newUser = new User();
            newUser.username = token.preferred_username;
            newUser.name = token.name;
            newUser.roles = [];
            newUser.oid = token.oid;
            newUser.save(err2 => {
                if (err2) {
                    console.log(err2);
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

passport.serializeUser((user: User, done) => {
    done(null, user._id);
});

passport.deserializeUser((id, done) => {
    const users = User.find();
    const matchingUser = users.find(user => user._id === id);
    done(null, matchingUser);
});

const middleware = express();
export const passportMiddleware = passport.initialize();

middleware.use(passportMiddleware);
middleware.use(passport.session());

export default middleware;