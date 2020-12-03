"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const passport_azure_ad_1 = require("passport-azure-ad");
const user_1 = __importDefault(require("../models/user"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Azure Active Directory configuration
const credentials = {
    // eslint-disable-next-line no-undef
    identityMetadata: `https://login.microsoftonline.com/${process.env.tenantID}/v2.0/.well-known/openid-configuration`,
    // eslint-disable-next-line no-undef
    clientID: `${process.env.clientID}`
};
passport_1.default.use(new passport_azure_ad_1.BearerStrategy(credentials, (token, done) => {
    // Checks if user already exists in the DB
    user_1.default.findOne({ 'oid': token.oid }, (err, user) => {
        if (err) {
            return done(err);
        }
        if (user) {
            // Returns the user if found
            return done(null, user, token);
        }
        else {
            // Creates the user from azure oid if not found
            const newUser = new user_1.default();
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
const middleware = express_1.default();
middleware.use(passport_1.default.initialize());
middleware.use(passport_1.default.session());
exports.default = middleware;
//# sourceMappingURL=auth.js.map