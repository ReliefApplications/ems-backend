import express from 'express';
import passport from 'passport';
import { BearerStrategy, IBearerStrategyOption, ITokenPayload } from 'passport-azure-ad';
import * as dotenv from 'dotenv';
import { User, Client } from '../../models';
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

passport.use(new BearerStrategy(credentials, (token: ITokenPayload, done) => {
    // === USER ===
    if (token.name) {
        // Checks if user already exists in the DB
        User.findOne({ $or: [{ 'oid': token.oid }, { 'username': token.preferred_username }] }, (err, user: User) => {
            if (err) {
                return done(err);
            }
            if (user) {
                // Returns the user if found
                // return done(null, user, token);
                if (!user.oid) {
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
                const newUser = new User({
                    username: token.preferred_username,
                    name: token.name,
                    oid: token.oid,
                    roles: [],
                    positionAttributes: []
                });
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
    }
    // === CLIENT ===
    else if (token.azp) {
        // Checks if client already exists in the DB
        Client.findOne({ $or: [{ 'oid': token.oid }, { 'clientId': token.azp }] }, (err, client: Client) => {
            if (err) {
                return done(err);
            }
            if (client) {
                // Returns the client if found and add more information if first connection
                if (!client.oid || !client.clientId) {
                    client.azureRoles = token.roles;
                    client.oid = token.oid;
                    client.clientId = token.azp;
                    client.save(err2 => {
                        if (err2) {
                            console.log(err2);
                        }
                        return done(null, client, token);
                    });
                } else {
                    return done(null, client, token);
                }
            } else {
                // Creates the client from azure oid if not found
                const newClient = new Client({
                    name: `${token.azp} / ${token.roles.join(',')}`,
                    azureRoles: token.roles,
                    clientId: token.azp,
                    oid: token.oid,
                    roles: [],
                    positionAttributes: []
                });
                newClient.save(err2 => {
                    if (err2) {
                        console.log(err2);
                    }
                    return done(null, newClient, token);
                });
            }
            done(null, null, token);
        }).populate({
            // Add to the context all roles / permissions the client has
            path: 'roles',
            model: 'Role',
            populate: {
                path: 'permissions',
                model: 'Permission'
            }
        }).populate({
            // Add to the context all positionAttributes with corresponding categories
            path: 'positionAttributes.category',
            model: 'PositionAttributeCategory',
        });
    }
}));

const authMiddleware = express();
authMiddleware.use(passport.initialize());
authMiddleware.use(passport.session());

export { authMiddleware };
