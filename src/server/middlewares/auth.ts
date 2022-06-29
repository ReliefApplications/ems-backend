import express from 'express';
import passport from 'passport';
import {
  BearerStrategy,
  IBearerStrategyOptionWithRequest,
  ITokenPayload,
} from 'passport-azure-ad';
import * as dotenv from 'dotenv';
import { User, Client } from '../../models';
import { authenticationType } from '../../oort.config';
import KeycloackBearerStrategy from 'passport-keycloak-bearer';
import {
  getSetting,
  updateUserAttributes,
} from '../../utils/user/userManagement';
dotenv.config();

/** Express application for the authorization middleware */
const authMiddleware = express();
authMiddleware.use(passport.initialize());
authMiddleware.use(passport.session());

// Use custom authentication endpoint or azure AD depending on config
if (process.env.AUTH_TYPE === authenticationType.keycloak) {
  const credentials = {
    realm: process.env.REALM,
    url: process.env.AUTH_URL,
  };
  passport.use(
    new KeycloackBearerStrategy(credentials, (token, done) => {
      // === USER ===
      if (token.name) {
        // Checks if user already exists in the DB
        User.findOne(
          { $or: [{ oid: token.sub }, { username: token.email }] },
          (err, user: User) => {
            if (err) {
              return done(err);
            }
            if (user) {
              // Returns the user if found
              // return done(null, user, token);
              if (!user.oid) {
                user.name = token.name;
                user.oid = token.sub;
                user.modifiedAt = new Date();
                user.save((err2, res) => {
                  if (err2) {
                    return done(err2);
                  }
                  return done(null, res, token);
                });
              } else {
                return done(null, user, token);
              }
            } else {
              // Creates the user from azure oid if not found
              user = new User({
                username: token.email,
                name: token.name,
                oid: token.sub,
                roles: [],
                positionAttributes: [],
                modifiedAt: new Date(),
              });
              user.save((err2, res) => {
                if (err2) {
                  return done(err2);
                }
                return done(null, res, token);
              });
            }
          }
        )
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
          });
      }
    })
  );
} else {
  // Azure Active Directory configuration
  const credentials: IBearerStrategyOptionWithRequest = process.env.tenantID
    ? {
        // eslint-disable-next-line no-undef
        identityMetadata: `https://login.microsoftonline.com/${process.env.tenantID}/v2.0/.well-known/openid-configuration`,
        // eslint-disable-next-line no-undef
        clientID: `${process.env.clientID}`,
        passReqToCallback: true,
      }
    : {
        // eslint-disable-next-line no-undef
        identityMetadata:
          'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
        // eslint-disable-next-line no-undef
        clientID: `${process.env.clientID}`,
        validateIssuer: true,
        // 9188040d-6c67-4c5b-b112-36a304b66dad -> MSA account
        issuer: process.env.ALLOWED_ISSUERS.split(', ').map(
          (x) => `https://login.microsoftonline.com/${x}/v2.0`
        ),
        passReqToCallback: true,
      };

  passport.use(
    new BearerStrategy(credentials, (req, token: ITokenPayload, done) => {
      // === USER ===
      if (token.name) {
        // Checks if user already exists in the DB
        User.findOne(
          {
            $or: [{ oid: token.oid }, { username: token.preferred_username }],
          },
          (err, user: User) => {
            if (err) {
              return done(err);
            }
            getSetting().then(async (setting) => {
              if (user) {
                // Returns the user if found but update it if needed
                // For the moment use custom token
                // req.headers.authorization = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSIsImtpZCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSJ9.eyJhdWQiOiI3NWRlY2EwNi1hZTA3LTQ3NjUtODVjMC0yM2U3MTkwNjI4MzMiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9mNjEwYzBiNy1iZDI0LTRiMzktODEwYi0zZGMyODBhZmI1OTAvIiwiaWF0IjoxNjU2NDMxMjU4LCJuYmYiOjE2NTY0MzEyNTgsImV4cCI6MTY1NjQzNTk5NywiYWNyIjoiMSIsImFpbyI6IkFVUUF1LzhUQUFBQWZXYWttcUNFZkZEMnl0TWVKM3NYMUZvd1AwYmNkL2s5RFpEQlpGY2dCTjMvYlpyeFVPV2NkTkE4Yi9pbktHM1VmLytXZmRsemVIYXB4L1kwS0NoU0VRPT0iLCJhbXIiOlsicHdkIl0sImFwcGlkIjoiODc3ZGFmNWMtNjMyOS00NjEyLTkwMjYtYWJjZTA3YWU1ODk1IiwiYXBwaWRhY3IiOiIwIiwiZW1haWwiOiJwYWNvbWVAcmVsaWVmYXBwbGljYXRpb25zLm9yZyIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0L2ZiYWNkNDhkLWNjZjQtNDgwZC1iYWYwLTMxMDQ4MzY4MDU1Zi8iLCJpcGFkZHIiOiIxMDkuMTAuMTczLjIwIiwibmFtZSI6IlBhY29tZSBSaXZpZXJlIiwib2lkIjoiNTA4ODFmNmYtN2E4MC00ZWQ1LWFkYjctN2EzYTVjYjY5NTI2IiwicmgiOiIwLkFVY0F0OEFROWlTOU9VdUJDejNDZ0stMWtBYkszblVIcm1WSGhjQWo1eGtHS0ROSEFMOC4iLCJzY3AiOiJhY2Nlc3NfYXNfdXNlciIsInNpZCI6IjdkN2ExZjgwLTUwMmYtNGU0YS04YmU3LWRhZmU5NjUyZDFkOCIsInN1YiI6ImNYNTNEbkVkM25ob3pKMFp2T3NUTjlaVFZNamtGbmRyQlhzT2lzT0ZsZ28iLCJ0aWQiOiJmNjEwYzBiNy1iZDI0LTRiMzktODEwYi0zZGMyODBhZmI1OTAiLCJ1bmlxdWVfbmFtZSI6InBhY29tZUByZWxpZWZhcHBsaWNhdGlvbnMub3JnIiwidXRpIjoiNGlGTWtzRVNoVUNoMDRva3gzazRBQSIsInZlciI6IjEuMCJ9.SOZ2GDVrvyPGk5SNhMQ5o_m48IYU3cdwM_4VBKFxG14LHBE0Ev-RxUtJ9w1nHN5bgtjRC1LXro0btbA3uE_EbYUTaPT3jzo0CCyCCVNlN8c3SEt9ByzuwCXIZiRfHJdJeuorTHvDSS_GpQPGTmeUx9YoH1le6MlVRaScezigPea85cqTXgyePPHz-mW11Uubf4qyzE9k2L26RZxTV7NR3F-UU_9fwF3aXfBFxUGMakGNIMm9pgR0zj0SxgYB1XN9hGEx_2njzQDeDjK-bxZ5LOMIwy_jprhTeeavQjeP0GIj-yPiu9UTkAITGWxuxZmqjlRQCczjP883tdHNGgNerQ';
                if (!user.oid) {
                  user.name = token.name;
                  user.oid = token.oid;
                  await updateUserAttributes(
                    setting,
                    user,
                    req.headers.authorization
                  );
                  user.save((err2, res) => {
                    if (err2) {
                      return done(err2);
                    }
                    return done(null, res, token);
                  });
                } else {
                  const changed = await updateUserAttributes(
                    setting,
                    user,
                    req.headers.authorization
                  );
                  if (changed) {
                    user.modifiedAt = new Date();
                    user.save((err2, res) => {
                      if (err2) {
                        return done(err2);
                      }
                      return done(null, res, token);
                    });
                  } else {
                    return done(null, user, token);
                  }
                }
              } else {
                // Creates the user from azure oid if not found
                user = new User({
                  username: token.preferred_username,
                  name: token.name,
                  oid: token.oid,
                  roles: [],
                  positionAttributes: [],
                  modifiedAt: new Date(),
                });
                await updateUserAttributes(
                  setting,
                  user,
                  req.headers.authorization
                );
                user.save((err2, res) => {
                  if (err2) {
                    return done(err2);
                  }
                  return done(null, res, token);
                });
              }
            });
          }
        )
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
          });
        // === CLIENT ===
      } else if (token.azp) {
        // Checks if client already exists in the DB
        Client.findOne(
          { $or: [{ oid: token.oid }, { clientId: token.azp }] },
          (err, client: Client) => {
            if (err) {
              return done(err);
            }
            if (client) {
              // Returns the client if found and add more information if first connection
              if (!client.oid || !client.clientId) {
                client.azureRoles = token.roles;
                client.oid = token.oid;
                client.clientId = token.azp;
                client.save((err2, res) => {
                  if (err2) {
                    return done(err2);
                  }
                  return done(null, res, token);
                });
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
              client.save((err2, res) => {
                if (err2) {
                  return done(err2);
                }
                return done(null, res, token);
              });
            }
          }
        )
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
          });
      }
    })
  );
}

export { authMiddleware };
