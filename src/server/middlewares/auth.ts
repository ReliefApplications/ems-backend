import express from 'express';
import passport, { Strategy } from 'passport';
import {
  BearerStrategy,
  IBearerStrategyOptionWithRequest,
  ITokenPayload,
} from 'passport-azure-ad';
import { User, Client } from '@models';
import { AuthenticationType } from '../../oort.config';
import KeycloackBearerStrategy from 'passport-keycloak-bearer';
import { updateUser, userAuthCallback } from '@utils/user';
import config from 'config';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@lib/logger';

/** Express application for the authorization middleware */
const authMiddleware = express();
authMiddleware.use(
  session({ secret: uuidv4(), resave: false, saveUninitialized: true })
);
authMiddleware.use(passport.initialize());
authMiddleware.use(passport.session());

/** Get audience */
const audience = JSON.parse(config.get<string>('auth.audience'));

// Use custom authentication endpoint or azure AD depending on config
if (config.get('auth.provider') === AuthenticationType.keycloak) {
  const credentials = {
    realm: config.get('auth.realm') as string,
    url: config.get('auth.url') as string,
  };
  passport.use(
    new KeycloackBearerStrategy(credentials, (token, done) => {
      // === USER ===
      if (token.name) {
        // Checks if user already exists in the DB
        User.findOne({ $or: [{ oid: token.sub }, { username: token.email }] })
          .populate({
            // Add to the user context all roles / permissions it has
            path: 'roles',
            model: 'Role',
            populate: {
              path: 'permissions',
              model: 'Permission',
            },
          })
          // .populate({
          //   path: 'groups',
          //   model: 'Group',
          // })
          .populate({
            // Add to the user context all positionAttributes with corresponding categories it has
            path: 'positionAttributes.category',
            model: 'PositionAttributeCategory',
          })
          .then((user) => {
            if (user) {
              // Returns the user if found
              // return done(null, user, token);
              if (!user.oid) {
                user.firstName = token.given_name;
                user.lastName = token.family_name;
                user.name = token.name;
                user.oid = token.sub;
                user.deleteAt = undefined; // deactivate the planned deletion
                user
                  .save()
                  .then(() => {
                    userAuthCallback(null, done, token, user);
                  })
                  .catch((err2) => {
                    userAuthCallback(err2, done, token, user);
                  });
              } else {
                if (!user.firstName || !user.lastName) {
                  if (!user.firstName) {
                    user.firstName = token.given_name;
                  }
                  if (!user.lastName) {
                    user.lastName = token.family_name;
                  }
                  user
                    .save()
                    .then(() => {
                      userAuthCallback(null, done, token, user);
                    })
                    .catch((err2) => {
                      userAuthCallback(err2, done, token, user);
                    });
                } else {
                  userAuthCallback(null, done, token, user);
                }
              }
            } else {
              // Creates the user from azure oid if not found
              user = new User({
                firstName: token.given_name,
                lastName: token.family_name,
                username: token.email,
                name: token.name,
                oid: token.sub,
                roles: [],
                positionAttributes: [],
              });
              user
                .save()
                .then(() => {
                  userAuthCallback(null, done, token, user);
                })
                .catch((err2) => {
                  userAuthCallback(err2, done, token, user);
                });
            }
          })
          .catch((err) => done(err));
      }
    }) as Strategy
  );
} else {
  // Azure Active Directory configuration
  const credentials: IBearerStrategyOptionWithRequest = config.get(
    'auth.tenantId'
  )
    ? {
        // eslint-disable-next-line no-undef
        identityMetadata: `https://login.microsoftonline.com/${config.get(
          'auth.tenantId'
        )}/v2.0/.well-known/openid-configuration`,
        // eslint-disable-next-line no-undef
        clientID: `${config.get('auth.clientId')}`,
        passReqToCallback: true,
        ...(audience.length > 0 && {
          audience,
        }),
      }
    : {
        // eslint-disable-next-line no-undef
        identityMetadata:
          'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
        // eslint-disable-next-line no-undef
        clientID: `${config.get('auth.clientId')}`,
        validateIssuer: true,
        // 9188040d-6c67-4c5b-b112-36a304b66dad -> MSA account
        issuer: (config.get('auth.allowedIssuers') as string[]).map(
          (x) => `https://login.microsoftonline.com/${x}/v2.0`
        ),
        passReqToCallback: true,
        loggingLevel: 'info',
      };
  passport.use(
    new BearerStrategy(credentials, (req, token: ITokenPayload, done) => {
      // === USER ===
      if (token.name) {
        // Checks if user already exists in the DB
        User.findOne({
          $or: [{ oid: token.oid }, { username: token.preferred_username }],
        })
          .populate({
            // Add to the user context all roles / permissions it has
            path: 'roles',
            model: 'Role',
            populate: {
              path: 'permissions',
              model: 'Permission',
            },
          })
          .populate({
            // Add to the user context all positionAttributes with corresponding categories it has
            path: 'positionAttributes.category',
            model: 'PositionAttributeCategory',
          })
          .then((user) => {
            if (user) {
              // Returns the user if found but update it if needed
              if (!user.oid) {
                user.firstName = token.given_name;
                user.lastName = token.family_name;
                user.name = token.name;
                user.oid = token.oid;
                updateUser(user, req).then(() => {
                  user
                    .save()
                    .then(() => {
                      userAuthCallback(null, done, token, user);
                    })
                    .catch((err2) => {
                      userAuthCallback(err2, done, token, user);
                    });
                });
              } else {
                updateUser(user, req).then((changed) => {
                  if (changed || !user.firstName || !user.lastName) {
                    if (!user.firstName) {
                      user.firstName = token.given_name;
                    }
                    if (!user.lastName) {
                      user.lastName = token.family_name;
                    }
                    user
                      .save()
                      .then(() => {
                        userAuthCallback(null, done, token, user);
                      })
                      .catch((err2) => {
                        userAuthCallback(err2, done, token, user);
                      });
                  } else {
                    userAuthCallback(null, done, token, user);
                  }
                });
              }
            } else {
              // Creates the user from azure oid if not found
              user = new User({
                firstName: token.given_name,
                lastName: token.family_name,
                username: token.preferred_username,
                name: token.name,
                oid: token.oid,
                roles: [],
                positionAttributes: [],
              });
              updateUser(user, req).then(() => {
                user
                  .save()
                  .then(() => {
                    userAuthCallback(null, done, token, user);
                  })
                  .catch((err2) => {
                    userAuthCallback(err2, done, token, user);
                  });
              });
            }
          })
          .catch((err) => {
            done(err);
          });
        // === CLIENT ===
      } else if (token.azp) {
        // Checks if client already exists in the DB
        Client.findOne({
          $or: [{ oid: token.oid }, { clientId: token.azp }],
        })
          .populate({
            // Add to the context all roles / permissions the client has
            path: 'roles',
            model: 'Role',
            populate: {
              path: 'permissions',
              model: 'Permission',
            },
          })
          .populate({
            // Add to the context all positionAttributes with corresponding categories
            path: 'positionAttributes.category',
            model: 'PositionAttributeCategory',
          })
          .then((client) => {
            if (client) {
              // Returns the client if found and add more information if first connection
              if (!client.oid || !client.clientId) {
                client.azureRoles = token.roles;
                client.oid = token.oid;
                client.clientId = token.azp;
                client
                  .save()
                  .then((res) => done(null, res, token))
                  .catch((error) => done(error));
              } else {
                return done(null, client, token);
              }
            } else {
              // Creates the client from azure oid if not found
              client = new Client({
                name: `${token.azp}${
                  token.roles ? ' / ' + token.roles.join(',') : ''
                }`,
                azureRoles: token.roles,
                clientId: token.azp,
                oid: token.oid,
                roles: [],
                positionAttributes: [],
              });
              client
                .save()
                .then((res) => done(null, res, token))
                .catch((error) => done(error));
            }
          });
      } else {
        logger.info(token);
        return done('error');
      }
    })
  );
}

export { authMiddleware };
