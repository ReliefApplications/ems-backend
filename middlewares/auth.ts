import express from 'express';
import passport from 'passport';
import { BearerStrategy, IBearerStrategyOption } from 'passport-azure-ad';
import * as dotenv from 'dotenv';
import { User } from '../models';
dotenv.config();


// Azure Active Directory configuration
const credentials: IBearerStrategyOption = process.env.tenantID ? {
    // eslint-disable-next-line no-undef
    identityMetadata: `https://login.microsoftonline.com/${process.env.tenantID}/v2.0/.well-known/openid-configuration`,
    // eslint-disable-next-line no-undef
    clientID: `${process.env.clientID}`
} : {
    // eslint-disable-next-line no-undef
    identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    // eslint-disable-next-line no-undef
    clientID: `${process.env.clientID}`,
    validateIssuer: true,
    // 9188040d-6c67-4c5b-b112-36a304b66dad -> MSA account
    issuer: process.env.ALLOWED_ISSUERS.split(', ').map(x => `https://login.microsoftonline.com/${x}/v2.0`)
};

passport.use(new BearerStrategy(credentials, (token: any, done) => {
    // Checks if user already exists in the DB
    User.findOne({ $or: [{ 'oid': token.oid }, {'username': token.preferred_username }] }, (err, user) => {
        if (err) {
            return done(err);
        }

        if (user) {
            // Returns the user if found
            // return done(null, user, token);
            if (!user.oid) {
                user.name = token.name;
                user.oid = token.oid;
                user.save(err2 => {
                    if (err2) {
                        console.log(err2);
                    }
                    return done(null, user, token);
                });
            } else {
                return done(null, user, token);
            }
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
    }).populate({
        // Add to the user context all positionAttributes with corresponding categories it has
        path: 'positionAttributes.category',
        model: 'PositionAttributeCategory',
    });
}));

const middleware = express();
middleware.use(passport.initialize());
middleware.use(passport.session());

export default middleware;